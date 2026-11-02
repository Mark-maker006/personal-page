import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ABOUT_CENTER,
  BUNDLE_CENTER,
  CONTACT_CENTER,
  OVERVIEW_CENTER,
  SAMPLES,
  buildShapes,
} from "./shapes";
import { SEED, STRAND_COUNT, TRUNK_TONES } from "./strands";
import { createPostFX } from "./postfx";

const FOV = 50;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const THREADS = 32;
const LABEL_ABOVE = new Set(["workbench", "phonics", "research"]);

// 每个粒子属于一条脉络（aStrand）里的一根细丝（aThread），沿路径的位置是 aU + 时间 × 流速。
// 相邻两幕的路径都从形态纹理里取，再按 uMorph 插值（每个粒子带一点随机先后，像一群光点迁徙）。
// 细丝围绕路径中心线螺旋缠绕，粗细、明暗、绕速各不相同，合起来就是一束“时间线”。
const vertexShader = /* glsl */ `
  uniform sampler2D uPaths;
  uniform float uShapeA;
  uniform float uShapeB;
  uniform float uMorph;
  uniform float uTime;
  uniform float uFlow;
  uniform float uScale;
  uniform float uBreath;
  uniform float uEmph[${STRAND_COUNT}];
  uniform float uSpread[${STRAND_COUNT}];
  uniform vec3 uBundle;
  uniform vec3 uRayO;
  uniform vec3 uRayD;
  uniform float uPush;
  uniform float uRadius;
  uniform float uBurst;
  uniform float uMaxSize;
  uniform float uBurstStrand;
  attribute float aStrand;
  attribute float aU;
  attribute float aRand;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aBright;
  attribute float aStray;
  attribute vec4 aThread;
  attribute vec3 aJitter;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  vec4 samplePath(float shape, float u) {
    int row = int(shape * ${STRAND_COUNT}.0 + aStrand + 0.5);
    float fx = clamp(u, 0.0, 1.0) * ${SAMPLES - 1}.0;
    int x0 = int(floor(fx));
    int x1 = min(x0 + 1, ${SAMPLES - 1});
    vec4 a = texelFetch(uPaths, ivec2(x0, row), 0);
    vec4 b = texelFetch(uPaths, ivec2(x1, row), 0);
    vec4 r = mix(a, b, fract(fx));
    r.w = (a.w < 0.0 || b.w < 0.0) ? -1.0 : r.w;
    return r;
  }

  void main() {
    int si = int(aStrand + 0.5);
    float emph = uEmph[si];
    float spread = uSpread[si] * uBreath;
    float u = fract(aU + uTime * uFlow * aSpeed);
    float du = 2.0 / ${SAMPLES}.0;
    vec4 A = samplePath(uShapeA, u);
    vec4 B = samplePath(uShapeB, u);
    vec3 TA = samplePath(uShapeA, u + du).xyz - A.xyz;
    vec3 TB = samplePath(uShapeB, u + du).xyz - B.xyz;
    // 先后错开得很开：半路时一部分已落位、一部分还在原处，两个形态都看得出来，像一根根丝被抽过去
    float m = smoothstep(0.0, 1.0, clamp((uMorph - aRand * 0.7) / 0.3, 0.0, 1.0));
    // 迁徙途中细丝被扯散成乱丝，落定时重新收紧
    float fly = sin(m * 3.14159);

    vec3 T = normalize(mix(TA, TB, m) + vec3(1e-5, 2e-5, 0.0));
    vec3 up = abs(T.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 N = normalize(cross(T, up));
    vec3 Bn = cross(T, N);
    float ang = aThread.x + u * aThread.y * 6.2832 + uTime * 0.12 * sign(aThread.y);
    float r = aThread.z * spread * (1.0 + fly * 1.4);
    vec3 pos = mix(A.xyz, B.xyz, m)
      + (N * cos(ang) + Bn * sin(ang)) * r
      + aJitter * (aThread.w * spread + fly * 0.32);

    vec4 wp = modelMatrix * vec4(pos, 1.0);
    // 指针扰动：以视线为轴，半径内的粒子被推开
    vec3 rel = wp.xyz - uRayO;
    vec3 perp = rel - uRayD * dot(rel, uRayD);
    float d = length(perp);
    float f = uPush * exp(-d * d / (uRadius * uRadius));
    wp.xyz += perp / (d + 1e-3) * f * uRadius;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;

    // 沿路径滚动的亮带：粒子经过时变亮变大，就是“电脉冲”
    float pp = fract(u * 3.0 - uTime * 0.32 + aStrand * 0.27);
    float band = smoothstep(0.0, 0.03, pp) * (1.0 - smoothstep(0.03, 0.18, pp));
    // 项目小交互触发的一道脉冲：沿这条光丝从头跑到尾
    if (uBurst >= 0.0 && abs(aStrand - uBurstStrand) < 0.5) {
      float db = (u - uBurst) / 0.035;
      band += exp(-db * db) * 2.2;
    }
    // 游离的毛丝里有一部分是火花：大部分时间暗着，偶尔闪一下
    float spark = aStray * step(0.5, aRand) * pow(max(sin(uTime * (1.5 + aRand * 4.0) + aRand * 40.0), 0.0), 12.0);
    // 镜头贴近时粒子会变得很大，填充率暴涨；封顶以保证集成显卡也跑得动
    gl_PointSize = min(aSize * uScale * (1.0 + band * 0.9 + f * 0.8 + spark * 1.5) / -mv.z, uMaxSize);

    float cm = mix(max(A.w, 0.0), max(B.w, 0.0), m);
    float vis = mix(step(0.0, A.w), step(0.0, B.w), m);
    vColor = mix(uBundle, aColor, cm) * aBright * (0.6 + band * 1.6 + f + spark * 3.0);
    vAlpha = vis * mix(0.06, 1.0, emph) * (aStray > 0.5 ? 0.35 + spark * 2.0 : 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uIntensity;
  uniform float uLinearOut;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.004) discard;
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    vec3 c = vColor;
    // 走后期管线时最后会统一做 sRGB 编码，这里先还原成线性值，保持和直接渲染时一样的颜色。
    // 用 uniform 切换而不是宏：中途退回直接渲染时不必重新编译着色器（否则会卡住一两秒）
    c = mix(c, pow(max(c, vec3(0.0)), vec3(2.2)), uLinearOut);
    float alpha = a * a * vAlpha * uIntensity;
    // 浮点渲染目标里，极暗粒子的叠加会累积成一层灰雾；8 位屏幕上它们本来就被舍入为 0，
    // 这里按同样的门槛丢弃，让两条渲染路径看起来一致
    if (uLinearOut > 0.5 && alpha * max(c.r, max(c.g, c.b)) < 0.5 / 255.0) discard;
    gl_FragColor = vec4(c, alpha);
  }
`;

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 球体内均匀分布的随机偏移
function randomInBall() {
  for (;;) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const z = Math.random() * 2 - 1;
    if (x * x + y * y + z * z <= 1) return [x, y, z];
  }
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// 主干色调：默认白金，地址里带 ?tone=cold 时用冷白，方便对比
function trunkTone() {
  try {
    return new URLSearchParams(window.location.search).get("tone") === "cold" ? TRUNK_TONES.cold : TRUNK_TONES.gold;
  } catch {
    return TRUNK_TONES.gold;
  }
}

// 整个首页共用一块常驻画布：滚动进度是连续的"场景序号"，粒子在相邻两幕的形态之间迁徙，
// 镜头、亮度、粗细也在两幕的关键帧之间插值。
// 如果最后一幕标记为 loop（与开头完全相同），进度就是首尾相接的环：序号 N 等同于 0。
export default function MultiverseScene({ projects, scenes, progressRef, reduced, onSelect }) {
  const hostRef = useRef(null);
  const labelRefs = useRef([]);
  const onSelectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return undefined;
    }
    renderer.setClearColor(0x050507, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    host.appendChild(renderer.domElement);

    const period = scenes[scenes.length - 1]?.loop ? scenes.length - 1 : 0;
    const tone = trunkTone();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 160);
    const glowTex = makeGlowTexture();
    const disposables = [glowTex];

    // 背景星尘：给深空一点纵深
    const starCount = 1400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 1] = -14 + Math.random() * 32;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x8d93a8,
      size: 0.1,
      map: glowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // 粒子数按设备分档：触屏或窄屏设备少一些
    const light = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
    const perStrand = light ? 6000 : 20000;
    const count = perStrand * projects.length;
    const aStrand = new Float32Array(count);
    const aU = new Float32Array(count);
    const aRand = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aBright = new Float32Array(count);
    const aStray = new Float32Array(count);
    const aThread = new Float32Array(count * 4);
    const aJitter = new Float32Array(count * 3);
    const aColor = new Float32Array(count * 3);
    projects.forEach((project, s) => {
      const color = new THREE.Color(project.color);
      // 每条脉络由若干细丝组成：有粗有细（fuzz）、有明有暗、绕速和方向各异
      const threads = Array.from({ length: THREADS }, () => ({
        phase: Math.random() * Math.PI * 2,
        twist: (1.5 + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1),
        radius: Math.pow(Math.random(), 0.7),
        fuzz: 0.04 + Math.pow(Math.random(), 2) * 0.35,
        bright: 0.35 + Math.random() * 0.95,
      }));
      for (let k = 0; k < perStrand; k++) {
        // 四条脉络交错排列：只画前一部分粒子时，每条脉络都均匀地少一些，而不是整条消失
        const i = k * projects.length + s;
        const stray = Math.random() < 0.07;
        const th = threads[Math.floor(Math.pow(Math.random(), 1.4) * THREADS)];
        aStrand[i] = s;
        aU[i] = Math.random();
        aRand[i] = Math.random();
        aSpeed[i] = 0.6 + Math.random() * 0.8;
        aStray[i] = stray ? 1 : 0;
        aSize[i] = stray ? 0.4 + Math.random() * 0.6 : 0.5 + Math.random() * Math.random() * 1.6;
        aBright[i] = stray ? 0.7 : th.bright;
        // 游离的毛丝离中心线更远、更松散
        aThread.set(
          stray
            ? [Math.random() * 6.28, (Math.random() - 0.5) * 8, 1.6 + Math.random() * 2.4, 0.8]
            : [th.phase, th.twist, th.radius, th.fuzz],
          i * 4,
        );
        aJitter.set(randomInBall(), i * 3);
        aColor.set([color.r, color.g, color.b], i * 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    // position 只是占位：真实位置都在着色器里从形态纹理算出来
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aStrand", new THREE.BufferAttribute(aStrand, 1));
    geo.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(aSpeed, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute("aBright", new THREE.BufferAttribute(aBright, 1));
    geo.setAttribute("aStray", new THREE.BufferAttribute(aStray, 1));
    geo.setAttribute("aThread", new THREE.BufferAttribute(aThread, 4));
    geo.setAttribute("aJitter", new THREE.BufferAttribute(aJitter, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));

    const pathTex = new THREE.DataTexture(
      new Float32Array(SAMPLES * 4 * scenes.length * STRAND_COUNT),
      SAMPLES,
      scenes.length * STRAND_COUNT,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    pathTex.minFilter = pathTex.magFilter = THREE.NearestFilter;

    const uniforms = {
      uPaths: { value: pathTex },
      uShapeA: { value: 0 },
      uShapeB: { value: 0 },
      uMorph: { value: 0 },
      uTime: { value: 0 },
      // 每秒沿路径走过的比例；减少动态时完全静止
      uFlow: { value: reduced ? 0 : 0.022 },
      uScale: { value: 1 },
      uBreath: { value: 1 },
      uEmph: { value: new Array(STRAND_COUNT).fill(1) },
      uSpread: { value: new Array(STRAND_COUNT).fill(0) },
      uBundle: { value: new THREE.Color(tone) },
      uRayO: { value: new THREE.Vector3() },
      uRayD: { value: new THREE.Vector3(0, 0, -1) },
      uPush: { value: 0 },
      uRadius: { value: 0.9 },
      uBurst: { value: -1 },
      uMaxSize: { value: 24 },
      uLinearOut: { value: 0 },
      uBurstStrand: { value: 0 },
      uIntensity: { value: light ? 0.75 : 0.42 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    disposables.push(geo, mat, pathTex);

    const spriteMat = (color, opacity) =>
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    // 四个宇宙的终点光点，只在总览时亮起
    const nodes = projects.map((project) => {
      const node = new THREE.Sprite(spriteMat(project.color, 0));
      scene.add(node);
      disposables.push(node.material);
      return node;
    });
    // 分叉点：每个项目就是一次“分叉事件”，翻到该项目时这里闪一下
    const forks = projects.map(() => {
      const fork = new THREE.Sprite(spriteMat(tone, 0));
      scene.add(fork);
      disposables.push(fork.material);
      return fork;
    });
    const projectScene = projects.map((_, i) => scenes.findIndex((sc) => sc.type === "project" && sc.project === i));
    // 种子 / 世界之树的核心光
    const seedMat = spriteMat(tone, 1);
    const seed = new THREE.Sprite(seedMat);
    scene.add(seed);
    disposables.push(seedMat);

    let width = 1;
    let height = 1;
    let keys = [];
    let narrowNow = null;

    const keyFor = (sc, narrow, sx, nodePos) => {
      const halfW = (d) => d * TAN * camera.aspect;
      const halfH = (d) => d * TAN;
      // 让目标点落在屏幕的 (fx, fy) 位置（以半宽、半高为单位），正对着看
      const frame = (t, d, fx, fy) => {
        const look = new THREE.Vector3(t.x - fx * halfW(d), t.y - fy * halfH(d), t.z);
        return { look, cam: look.clone().add(new THREE.Vector3(0, 0, d)) };
      };
      // 绕 y 轴环绕取景，同样把中心点放到屏幕 (fx, fy)
      const orbit = (c, r, theta, lift, fx, fy) => {
        const right = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
        const cam = c.clone().add(new THREE.Vector3(r * Math.sin(theta), lift, r * Math.cos(theta)));
        const look = c
          .clone()
          .addScaledVector(right, -fx * halfW(r))
          .add(new THREE.Vector3(0, -fy * halfH(r), 0));
        return { cam, look };
      };
      const fitD = Math.max(14, (7 * sx) / (TAN * camera.aspect));
      const all = (v) => new Array(STRAND_COUNT).fill(v);
      const base = { emph: all(1), spread: all(0.09), labels: 0, seed: 0, seedPos: new THREE.Vector3(...SEED) };
      switch (sc.type) {
        case "hero":
          return {
            ...base,
            spread: all(0.16),
            seed: 1,
            ...(narrow ? frame(base.seedPos, 9, 0, -0.42) : frame(base.seedPos, 8.5, 0.3, -0.1)),
          };
        case "bundle":
          return {
            ...base,
            spread: all(0.14),
            ...(narrow ? frame(BUNDLE_CENTER, 12, 0, -0.32) : frame(BUNDLE_CENTER, 10.5, 0.3, -0.02)),
          };
        case "overview":
          return {
            ...base,
            labels: 1,
            ...(narrow ? frame(OVERVIEW_CENTER, fitD * 1.02, 0, 0.12) : frame(OVERVIEW_CENTER, fitD, 0.1, 0.12)),
          };
        case "project": {
          const n = nodePos[sc.project];
          const emph = all(0.12).map((v, i) => (i === sc.project ? 1 : v));
          const spread = all(0.08).map((v, i) => (i === sc.project ? 0.04 : v));
          return { ...base, emph, spread, ...(narrow ? frame(n, 8.5, 0, 0.36) : frame(n, 8.4, 0.4, 0.02)) };
        }
        case "about": {
          const r = narrow ? fitD * 1.1 : 15;
          return {
            ...base,
            emph: all(0.7),
            spread: all(0.06),
            ...orbit(
              ABOUT_CENTER,
              r,
              -0.5 + sc.about * 0.36,
              1.5 + sc.about * 0.4,
              narrow ? 0 : 0.3,
              narrow ? 0.3 : 0,
            ),
          };
        }
        default:
          return {
            ...base,
            seed: 0.7,
            seedPos: new THREE.Vector3(CONTACT_CENTER.x, CONTACT_CENTER.y - 0.2, CONTACT_CENTER.z),
            ...orbit(CONTACT_CENTER, narrow ? fitD * 1.05 : 15, 0.15, 1.5, narrow ? 0 : 0.3, narrow ? 0.3 : 0),
          };
      }
    };

    const resize = () => {
      width = Math.max(host.clientWidth, 1);
      height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      fx?.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // 粒子的世界尺寸换算成像素：与画布高度、视角成正比
      uniforms.uScale.value = ((renderer.getPixelRatio() * height * 0.5) / TAN) * 0.028;
      uniforms.uMaxSize.value = 16 * renderer.getPixelRatio();
      const narrow = camera.aspect < 0.8;
      const sx = narrow ? 0.6 : 1;
      // 窄屏时横向压缩形态，镜头才能拉近、脉络不至于太小；只有跨越这个阈值才重算形态表
      if (narrow !== narrowNow) {
        narrowNow = narrow;
        const shapes = buildShapes(projects, scenes, sx, narrow ? 0.58 : 1);
        pathTex.image.data.set(shapes.data);
        pathTex.needsUpdate = true;
        nodes.forEach((node, i) => node.position.copy(shapes.nodes[i]));
        forks.forEach((fork, i) => fork.position.copy(shapes.forks[i]));
      }
      keys = scenes.map((sc) => keyFor(sc, narrow, sx, nodes.map((n) => n.position)));
    };

    // 指针：屏幕坐标用弹簧追随（会轻微过冲），扰动强度在移动时升高、静止后回落
    const pointer = { x: 0, y: 0, last: -1e9, inside: false };
    const spring = { x: 0, y: 0, vx: 0, vy: 0, push: 0, vpush: 0 };
    const shown = { s: 0, px: 0, py: 0 };
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const labelState = projects.map(() => null);

    const onPointer = (e) => {
      if (reduced) return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (!pointer.inside) {
        spring.x = pointer.x;
        spring.y = pointer.y;
      }
      pointer.inside = true;
      pointer.last = performance.now();
    };
    // 舞台上的小交互通过事件请求一道脉冲
    const burst = { start: 0, duration: 0 };
    const onPulse = (e) => {
      if (reduced) return;
      burst.start = performance.now();
      burst.duration = e.detail?.duration ?? 2.4;
      uniforms.uBurstStrand.value = e.detail?.strand ?? 0;
    };
    const onLeave = () => {
      pointer.inside = false;
    };

    let fx = null;
    let chroma = 0;
    const perf = { t: 0, n: 0, slow: 0, share: 1 };
    const baseIntensity = uniforms.uIntensity.value;
    const disableFx = () => {
      fx?.dispose();
      fx = null;
      host.dataset.fx = "direct";
      uniforms.uLinearOut.value = 0;
      renderer.setClearColor(0x050507, 1);
    };

    const draw = (time) => {
      const s = Math.min(Math.max(shown.s, 0), keys.length - 1);
      const i0 = Math.floor(s);
      const i1 = Math.min(i0 + 1, keys.length - 1);
      const f = easeInOut(s - i0);
      const a = keys[i0];
      const b = keys[i1];

      cam.lerpVectors(a.cam, b.cam, f);
      look.lerpVectors(a.look, b.look, f);
      // 镜头穿行：翻章途中先朝目标推近、并向一侧甩开，从光丝之间穿过去，落定时回到关键帧
      const mid = Math.sin(Math.PI * (s - i0));
      if (mid > 0.001) {
        tmp.subVectors(look, cam);
        const dist = tmp.length();
        tmp.normalize();
        cam.addScaledVector(tmp, dist * 0.2 * mid);
        tmp.cross(camera.up).normalize();
        cam.addScaledVector(tmp, (i0 % 2 ? 1.3 : -1.3) * mid);
      }
      camera.fov = FOV + 9 * mid;
      camera.updateProjectionMatrix();
      // 指针视差 + 极慢的漂移，让静止的场景也在"呼吸"
      cam.x += shown.px * 0.45 + Math.sin(time * 0.17) * 0.18;
      cam.y += -shown.py * 0.3 + Math.cos(time * 0.13) * 0.1;
      camera.position.copy(cam);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      stars.rotation.y = time * 0.006;

      uniforms.uShapeA.value = i0;
      uniforms.uShapeB.value = i1;
      uniforms.uMorph.value = f;
      uniforms.uTime.value = time;
      uniforms.uBurst.value = burst.duration ? (performance.now() - burst.start) / 1000 / burst.duration : -1;
      if (uniforms.uBurst.value > 1.1) {
        burst.duration = 0;
        uniforms.uBurst.value = -1;
      }
      uniforms.uBreath.value = reduced ? 1 : 1 + Math.sin(time * 1.1) * 0.12;
      for (let i = 0; i < STRAND_COUNT; i++) {
        uniforms.uEmph.value[i] = a.emph[i] + (b.emph[i] - a.emph[i]) * f;
        uniforms.uSpread.value[i] = a.spread[i] + (b.spread[i] - a.spread[i]) * f;
      }

      // 指针视线：从镜头出发穿过弹簧追随后的指针位置
      tmp.set(spring.x, spring.y, 0.5).unproject(camera);
      uniforms.uRayO.value.copy(camera.position);
      uniforms.uRayD.value.copy(tmp).sub(camera.position).normalize();
      uniforms.uPush.value = spring.push;

      const seedOn = lerp(a.seed, b.seed, f);
      seed.position.lerpVectors(a.seedPos, b.seedPos, f);
      seed.scale.setScalar((0.9 + Math.sin(time * 2.3) * 0.12) * seedOn);
      seed.material.opacity = seedOn;
      const labels = lerp(a.labels, b.labels, f);

      forks.forEach((fork, i) => {
        // 翻到该项目、粒子正在落位的那一刻闪光最强，停稳后保留一点余辉
        const at = s - projectScene[i];
        const flash = Math.exp(-(((at + 0.2) / 0.22) ** 2)) * 1.2 + Math.exp(-((at / 0.5) ** 2)) * 0.35 + labels * 0.3;
        fork.material.opacity = Math.min(flash, 1);
        fork.scale.setScalar(0.5 + flash * 1.4);
      });

      nodes.forEach((node, i) => {
        node.material.opacity = labels;
        node.scale.setScalar(0.9 * (1 + Math.sin(time * 2 + i) * 0.06));

        const label = labelRefs.current[i];
        if (!label) return;
        tmp.copy(node.position).project(camera);
        const x = Math.min(Math.max((tmp.x * 0.5 + 0.5) * width, 76), width - 76);
        const y = (-tmp.y * 0.5 + 0.5) * height;
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        label.style.opacity = labels.toFixed(3);
        const on = labels > 0.5;
        if (labelState[i] !== on) {
          labelState[i] = on;
          label.tabIndex = on ? 0 : -1;
          label.setAttribute("aria-hidden", on ? "false" : "true");
          label.style.pointerEvents = on ? "auto" : "none";
        }
      });

      if (fx) {
        try {
          fx.render(chroma);
          return;
        } catch {
          disableFx();
        }
      }
      renderer.render(scene, camera);
    };

    // 进度由滚动层连续给出（已经带阻尼），这里只把它折回环上：p 与 p ± N 是同一个画面
    const wrap = (p) => (period ? ((p % period) + period) % period : p);

    let frame = 0;
    let running = false;
    let last = performance.now();
    let elapsed = 0.8;
    const loop = (now) => {
      frame = 0;
      const realDt = (now - last) / 1000;
      const dt = Math.min(realDt, 0.05);
      last = now;
      elapsed += dt;
      // 指针视差带惯性追随，避免机械地一比一跟手
      const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      // 自适应降级（只在页面可见、真正在动时统计）：连续两段（各 1.5 秒）帧率偏低时，
      // 先关掉后期；仍然偏低就减少绘制的粒子数（最少保留 45%），亮度按比例补回
      perf.t += realDt;
      perf.n += 1;
      if (perf.t >= 1.5) {
        const rate = perf.n / perf.t;
        perf.slow = rate < (fx ? 40 : 50) ? perf.slow + 1 : 0;
        perf.t = 0;
        perf.n = 0;
        if (perf.slow >= 2) {
          perf.slow = 0;
          if (fx) disableFx();
          else if (perf.share > 0.45) {
            perf.share = Math.max(perf.share - 0.2, 0.45);
            geo.setDrawRange(0, Math.floor(count * perf.share));
            uniforms.uIntensity.value = baseIntensity / Math.sqrt(perf.share);
          }
        }
      }
      const prevS = shown.s;
      shown.s = wrap(progressRef.current);
      // 色散强度跟翻章速度走（跨过首尾接缝时按环上的距离算），停稳后衰减到 0
      let ds = Math.abs(shown.s - prevS);
      if (period) ds = Math.min(ds, period - ds);
      const target = reduced ? 0 : Math.min((ds / Math.max(dt, 1e-3)) * 0.004, 0.012);
      chroma += (target - chroma) * (1 - Math.exp(-dt * 10));
      shown.px += (pointer.x * 0.5 - shown.px) * k * 0.6;
      shown.py += (-pointer.y * 0.5 - shown.py) * k * 0.6;

      if (!reduced) {
        // 弹簧：刚度 70、阻尼 9，指针快速划过时扰动中心会略微甩过头再弹回
        spring.vx += ((pointer.x - spring.x) * 70 - spring.vx * 9) * dt;
        spring.vy += ((pointer.y - spring.y) * 70 - spring.vy * 9) * dt;
        spring.x += spring.vx * dt;
        spring.y += spring.vy * dt;
        const active = pointer.inside && now - pointer.last < 1400;
        spring.vpush += ((active ? 0.55 : 0) - spring.push) * 40 * dt - spring.vpush * 5 * dt;
        spring.push = Math.max(spring.push + spring.vpush * dt, -0.15);
      }
      draw(elapsed);
      if (running) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    resize();
    // 后期（泛光 + 色散）默认关闭：实测集成显卡上翻章时只有约 20fps。
    // 地址带 ?fx=on 才开启，且只在桌面；创建失败或持续掉帧都会自动退回直接渲染
    const fxOn = new URLSearchParams(window.location.search).get("fx") === "on";
    if (!light && fxOn) {
      fx = createPostFX(renderer, scene, camera, width, height);
      if (fx) {
        uniforms.uLinearOut.value = 1;
        // 清屏色在渲染目标里不会转成线性值，经过最后的 sRGB 编码会被编码两次、整屏发灰；
        // 后期模式下直接清成纯黑（和 #050507 肉眼无差）
        renderer.setClearColor(0x000000, 1);
      }
    }
    // 标在画布容器上，方便排查当前走的是哪条渲染路径
    host.dataset.fx = fx ? "bloom" : "direct";
    draw(elapsed);
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(elapsed);
    });
    ro.observe(host);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("multiverse:pulse", onPulse);
    document.documentElement.addEventListener("pointerleave", onLeave);
    if (!document.hidden) start();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("multiverse:pulse", onPulse);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      fx?.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects, scenes, progressRef, reduced]);

  return (
    <>
      <div ref={hostRef} className="multiverse-canvas" aria-hidden="true" />
      {!failed && (
        <div className="multiverse-nodes">
          {projects.map((project, i) => (
            <button
              key={project.id}
              ref={(el) => (labelRefs.current[i] = el)}
              type="button"
              // 中间几条分支最高、彼此最近，标签放到光点上方，避免和两侧的标签挤在一起
              className={`universe-node ${LABEL_ABOVE.has(project.id) ? "is-above" : ""}`}
              style={{ "--strand": project.color }}
              aria-label={`${project.title}：第 ${project.number} 号宇宙`}
              tabIndex={-1}
              onClick={() => onSelectRef.current(i)}
            >
              <span className="universe-index">//{project.number}</span>
              <span className="universe-title">{project.title}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
