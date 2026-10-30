import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// 色散：红蓝通道沿径向错开，强度由翻章速度决定，停稳时为 0
const ChromaShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - 0.5) * uAmount;
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + d).r;
      c.b = texture2D(tDiffuse, vUv - d).b;
      gl_FragColor = c;
    }
  `,
};

// 截断高光：叠加混合在浮点目标里会累积出远大于 1 的亮度（8 位屏幕上本来会被截到 1），
// 不截断的话泛光的低分辨率层会把这些能量摊到大半个屏幕，形成一层灰雾
const ClampShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: ChromaShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(min(c.rgb, vec3(1.2)), c.a);
    }
  `,
};

// 可选的后期：泛光 + 色散。设备不支持浮点渲染目标、创建或首帧出错时返回 null，
// 调用方继续用原来的直接渲染（着色器假辉光），不会黑屏也不会刷错误。
export function createPostFX(renderer, scene, camera, width, height) {
  const ext = renderer.extensions;
  if (!ext.has("EXT_color_buffer_float") && !ext.has("EXT_color_buffer_half_float")) return null;
  const gl = renderer.getContext();
  let composer;
  try {
    while (gl.getError() !== gl.NO_ERROR);
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new ShaderPass(ClampShader));
    // 阈值较高：只让脉冲亮带、种子和分叉闪光溢出光晕，细丝本身保持清晰
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.38, 0.05, 0.72));
    const chroma = new ShaderPass(ChromaShader);
    composer.addPass(chroma);
    composer.addPass(new OutputPass());

    renderer.setRenderTarget(composer.renderTarget1);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    renderer.setRenderTarget(null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer incomplete");
    composer.render(0);
    if (gl.getError() !== gl.NO_ERROR) throw new Error("gl error");

    return {
      render(amount) {
        chroma.uniforms.uAmount.value = amount;
        composer.render();
      },
      setSize(w, h) {
        composer.setSize(w, h);
      },
      dispose() {
        composer.passes.forEach((p) => p.dispose?.());
        composer.dispose();
      },
    };
  } catch {
    renderer.setRenderTarget(null);
    composer?.dispose();
    return null;
  }
}
