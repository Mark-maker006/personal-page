# 参考站拆解：Oryzo / Aaron J. Cunningham / Hubtown

> 用途：作为作品集"全局动效"改造的制作 brief。
> 采样方式：2026-10-30 在浏览器里逐章节滚动截图；读取页面上的 canvas、`window.__THREE__`、资源请求列表，并在 JS bundle 里做关键词计数。
> 可信度：**[实测]** = 亲眼看到或从资源/引擎标识直接读到；**[代码]** = bundle 里出现了该库或 API（说明打包进去了，但具体怎么用是推断）；**[推断]** = 根据画面反推的做法。

---

## 0. 一句话结论

这三个站之所以“全局都有动效”，不是因为每个 section 各写了一段动画，而是共用同一套骨架：

1. **一个常驻的 WebGL/WebGPU 画布**（`position: fixed`，全站只有一个 renderer），所有章节都是这一个场景的不同“状态”。
2. **滚动（或翻章）驱动一个 0→N 的进度值**，场景里的镜头、物体形态、材质参数、后期效果都只是这个进度的函数。
3. **DOM 文字层只负责排版和可访问性**。文字自己也有一套统一的入场语言（逐字/乱码解码/遮罩），由同一个进度或章节事件触发。
4. **每个章节至少有一个“只属于这一章”的交互**：可以玩、可以拖、可以 hover 揭示。这是“全局有交互”的真正来源，光靠“镜头在动”撑不起来。

我们的站已经有第 1、2 条（`MultiverseScene` 常驻 + `progressRef` 驱动镜头关键帧），**缺的是 3 和 4，以及第 2 条里“形态和材质随章节变化”的那一半**。目前每个场景只改了镜头位置和 `uEmph`，脉络本身的形状从头到尾不变。

---

## 1. Oryzo — oryzo.ai（Lusion 出品，Awwwards 2026 年 5 月 Site of the Month）

### 1.1 技术栈

| 层 | 用的东西 | 依据 |
|---|---|---|
| 站点框架 | **Astro**（静态生成，单个 hoisted 脚本约 1 MB） | [实测] `/_astro/hoisted.*.js` |
| 3D 引擎 | **three.js r178，Lusion 自己改过的版本**，WebGL（不是 WebGPU） | [实测] `__THREE__ = "178 - modified by Lusion"`；bundle 里有 35 处 `WebGLRenderer` |
| 着色器 | 大量手写 GLSL：`ShaderMaterial` 99 处、`RawShaderMaterial` 63 处 | [代码] |
| 材质 | transmission（透射/折射）、fresnel、bokeh 景深、gobo 投影光（`textures/gobo/*.avif`）、BRDF LUT | [代码]+[实测] 资源 |
| 后期 | **SMAA 抗锯齿**（`smaa-area.png`/`smaa-search.png`）+ Bloom + bokeh DOF | [实测] 资源 + [代码] |
| 模型/动画 | 自定义二进制格式 `.buf`，包括 `hero_camera.buf`（**镜头动画是在 DCC 软件里 K 好再导出的**）、`coaster_hero_animation.buf`、`hand.buf`/`hand_animation.buf` | [实测] |
| 光照 | 预烘焙：`env_*.webp` 环境图；`harmonics_0/1.avif`（球谐光照烘成贴图） | [实测] |
| 高斯泼溅 | `SplatsWorker`（在 Web Worker 里排序 splat） | [实测] `/_astro/SplatsWorker-*.js` |
| 2D 矢量动画 | **Rive**（`@rive-app/canvas@2.37.0` 的 wasm），用于 UI 小动画 | [实测] |
| 文字动画 | **GSAP SplitText**（151 处，是用得最多的库） | [代码] |
| 动效调度 | GSAP（时间线）+ 自写 `damp`/`lerp`（惯性跟随） | [代码] |
| 其他 | `AudioContext`（有声音）、`getUserMedia`（“TRY TO HOVER HAND”那段可能接了摄像头手势，未验证） | [代码] |

页面高度约 47,900px（约 62 屏），用原生滚动加大量 sticky 区段“钉住”，**没有用 Lenis**。

### 1.2 全站结构与交互（按滚动顺序实测）

| 区段 | 画面 | 交互 / 动效手法 |
|---|---|---|
| 开场 | 绿色画布上一个线稿圆环和贝塞尔控制柄（像 Illustrator 里的矢量编辑态） | 软木杯垫“从矢量线稿长成实体”，线稿就是加载进度 |
| Hero | 镜头从线稿拉远：绿色切割垫、铅笔、美工刀，杯垫是唯一的 3D 主角 | 预制镜头动画 `hero_camera.buf` 由滚动 scrub；道具是带 alpha 的贴图卡片（便宜但真实） |
| “Isn't just a coaster” | 纯黑底大字 | SplitText 逐词由灰变亮，滚动 scrub 而不是自动播放 |
| Powered by AI | 屏幕四边一圈彩虹渐变辉光（暗讽 AI 产品的视觉套路） | 全屏 shader 边缘辉光；“TRY TO HOVER HAND”：鼠标/手靠近触发 3D 手的动画（“AI 补全：说击掌，它听成了六根手指”） |
| So portable, it's wearable | 真人模特照片，杯垫戴在身上，带 AI 对话 UI 气泡 | 横向滑动的照片带，钉住后横移 |
| 37.9% more circular | 线稿杯垫加数学公式标注 | 回到开场的“矢量线稿”语言，前后呼应 |
| Smart Flip Encryption | 黑屏模糊大字 | **可玩的小功能**：输入文字 → 翻转加密 → 再翻回来解密 |
| Grip-locked antislip | 超微距软木纹理，切割垫网格 | 镜头推到材质层面，展示粗糙度和法线细节 |
| 物理参数 T=10/1/0.1 | 温度参数切换（嘲讽 LLM 的 temperature） | 切换按钮改变 3D 杯垫的物理表现 |
| Reviews | 星级评论 + 宇航员插图 | 常规卡片 |
| Legacy Support | 橙色底，古希腊、罗马、埃及、中国的古器皿各放在杯垫上 | 横向排列的产品摄影，滚动横移 |
| Pro / Pro Max | 1、2、3 层堆叠对比 | 3D 杯垫按选项实时堆叠 |
| Paper / BibTeX | 假论文页 | 叙事收尾 |

### 1.3 美学

- **单一主角**：整个站只有一个 3D 物体（杯垫），所有章节都在换它的“语境”：线稿、实物、穿戴、显微、古董、堆叠。物体不变，世界在变。
- **材质写实，构图极简**：真实的软木法线和透射光，背景常常是纯色（暗棕、近黑、橙）。
- **反讽文案驱动视觉**：每一章都在戏仿一种 AI 产品的视觉套路（彩虹辉光、temperature 参数、论文、benchmark），**视觉风格随章节主题切换，但主角物体始终统一**。
- 字体：只用 `halyard-display-variable` 一个可变字体，靠字重和字号拉开层级。
- 色彩：暖棕和黑做底，橙色点缀；每一章允许一个“主题色事件”（例如彩虹边框、橙色整屏）。

### 1.4 可以借鉴的点
- “矢量线稿 → 实体”的开场，可以对应我们的“种子 → 脉络生长”。
- **同一个主角在每一章换形态和语境**（这是全局一致感的来源）。
- 每章一个小而具体、能上手玩的交互（加密翻转、temperature 切换、堆叠选择）。
- 文字统一用 scrub 的逐词点亮。

---

## 2. Aaron J. Cunningham — aaronjcunningham.com（Awwwards 2026-08 Honorable Mention）

### 2.1 技术栈

| 层 | 用的东西 | 依据 |
|---|---|---|
| 站点框架 | **Next.js**（约 12 个 chunk、1.37 MB） | [实测] `/_next/` |
| 3D 引擎 | **three.js r185 + `WebGPURenderer`**（canvas 标识 `three.js r185 webgpu`），带 `forceWebGL` 回退 | [实测]+[代码] |
| 着色语言 | **TSL**（`Fn(` 16 处、`PointsNodeMaterial`、`SpriteNodeMaterial`、`MeshBasicNodeMaterial`、`mx_noise` 噪声） | [代码] |
| 粒子计算 | **GPU compute**：`StorageBufferAttribute` 17 处、`compute(` 17 处、`computeAsync`、`instancedArray`。页面角落写着 **“409,600 BODIES”**，就是粒子数 | [代码]+[实测] |
| 形态切换 | `morph` 128 处：粒子在多个目标形态之间插值 | [代码] |
| 后期 | TSL `PostProcessing` + `pass()`（大概率是 bloom 节点） | [代码] |
| 滚动 | **没有 GSAP 和 Lenis**。页面高度 = 视口高度，自己接管 `wheel`/`touchstart` 做翻章 | [实测] scrollHeight = innerHeight |
| 外部资源 | **几乎为零**：没有 glb、没有贴图，只有两个字体文件。所有形态都在代码里程序化生成 | [实测] |
| 字体 | Inter + JetBrains Mono | [实测] |
| 无障碍 | 处理了 `prefers-reduced-motion`；有 “SKIP EXPERIENCE / VIEW ALL WORK” 跳过入口 | [代码]+[实测] |

### 2.2 全站结构与交互（6 个章节 `//00`–`//05`，实测）

| 章节 | 粒子形态 | 主色 |
|---|---|---|
| //00 Hero | 一团球形粒子云，中心最亮 | 紫 |
| //01 Technical Depth | **一束发光的波浪线（很多条平行光丝起伏）** | 紫白 |
| //02 Spirit Realm | 一颗发光的满月或星球 | 冰蓝 |
| //03 The Nexus | 一个由大颗粒子排成的椭圆盘（像网络节点） | 青绿 |
| //04 DeFi Platform | 回到光丝束，但形态更扭曲、更密 | 冷白 |
| //05 Ambitious Ideas | 一个粒子构成的发光八面体晶体 | 粉 |

- **翻章**：一次滚轮 = 一章，粒子用约 1 秒从上一个形态流动到下一个形态（不是淡入淡出，而是每个粒子各自移动过去）。
- **鼠标扰动**：页脚写着 “SCROLL / MOVE TO DISTURB”，鼠标会推开附近的粒子，然后粒子弹回原位。
- **主色随章节切换**：粒子颜色和背景的暗色调一起变（紫 → 蓝 → 青 → 粉）。
- **UI 层**：左侧大标题，右侧章节刻度（竖排短横线），底部是技术标签行和进度条。所有 UI 都是等宽字体、全大写、`//01` 编号，营造“终端 / 系统面板”的气质。

### 2.3 美学

- **一个粒子系统演完全场**：和 Oryzo 的“同一个主角”是同一个思路，只是主角从实物换成了粒子场。
- 极暗背景加高亮粒子，辉光很重，大面积留黑。
- 标题用 Inter Thin（极细）和全大写，正文和 UI 用 JetBrains Mono，对比鲜明。
- 每章一个主色，但同一时刻全屏只有一个色相。

### 2.4 和我们最相关的点
- **//01 和 //04 的“光丝束”和我们的 strands 几乎是同一个视觉母题**：他把光丝当作粒子形态之一，我们可以反过来，让 strands 在不同章节变成不同形态。
- 翻章机制和我们现在 `Scenes.jsx` 的“一次滚动 = 一幕”一样，**骨架可以直接沿用**，要补的是“形态 morph”和“鼠标扰动”。
- 资源几乎为零、全部程序化生成，非常适合我们这种个人站：不需要建模，也不需要大体积资源。

---

## 3. Hubtown — hubtown.co.in（印度地产集团官网）

### 3.1 技术栈

| 层 | 用的东西 | 依据 |
|---|---|---|
| 站点框架 | **Nuxt**（Vue），约 16 个 chunk、3.1 MB | [实测] `/_nuxt/` |
| 3D 引擎 | **three.js r179**，WebGL2；bundle 里也有 `WebGPURenderer` 5 处（可能预留了 WebGPU 路径） | [实测]+[代码] |
| 镜头/动画编排 | **Theatre.js**（337 处，是用得最多的库）：镜头路径和物体动画在 Theatre 的可视化时间线里 K 帧，再按滚动 scrub | [代码] |
| 滚动 | **GSAP + ScrollTrigger + Lenis**（平滑滚动） | [代码] |
| 文字 | GSAP SplitText + **乱码解码效果**（加载时 `THSBMJYVN`、`INNOPYJR` 这类随机字母逐位变成正确文字） | [实测] |
| 着色器 | 大量手写 GLSL（`gl_FragColor` 212 处、`smoothstep` 105 处），用到 fresnel、`uMouse`、`uProgress`、simplex noise | [代码] |
| 后期 | `EffectComposer` + **UnrealBloom** + **ChromaticAberration**（色散） | [代码] |
| 资源管线 | **KTX2/Basis 压缩贴图**（`basis_transcoder.js`）、**Draco 压缩模型**；每个章节一个 glb（`scene_1`–`scene_4`、`map.glb`）；**Houdini 导出的高度图 EXR**（`scene3-houdini-height.exr`）；**点云位置 JSON**（`scene3_pts_*.json`、`scene4_cubes.json`） | [实测] |
| 实例化 | `InstancedMesh` 16 处（成片的立方体和光点） | [代码] |
| 声音 | 一整套 UI 音效：`ambient-loop.wav`、`hover.wav`、`click.wav`、`modal-open.wav`、`home-transition.wav`；默认静音，左下角开关 | [实测] |
| 加载 | 自定义 loader：一排点阵进度，加 0–100% 数字 | [实测] |

### 3.2 全站结构与交互（实测）

左侧有一个固定的章节导航：FUTURE / INNOVATION / COLLABORATION / EXCELLENCE / PURPOSE / LEGACY。

| 章节 | 画面 |
|---|---|
| Future | 夜色山谷，水面倒影，中央悬浮一个发光的蓝色玻璃立方体（Hubtown 的 logo 体）。滚动时立方体旋转、内部纹理变化 |
| Innovation | 镜头俯冲进地形，**一条由光点粒子组成的发光河流**沿峡谷蜿蜒 |
| （过渡） | 光河分叉成多条**带状光流**，镜头贴着光流飞行 |
| Collaboration | 多条光流从不同方向汇聚，远处地平线上浮现多个发光立方体（各个项目）；标题 “We work with a network of experts” |
| Excellence 及之后 | （后续章节依次推进；没有逐一截图） |

- **整站就是一次连续的镜头飞行**：章节之间没有切屏，镜头穿过地形，从一个场景飞进下一个场景，靠 Theatre.js 编排。
- **鼠标揭示**：立方体表面有 hex、grid、edges 多层贴图（`hero-cube-hex/grid/edges/details.ktx2`），鼠标经过的位置会显出更深一层的几何纹理（`uMouse` + 遮罩）。
- **文字乱码解码**：每次进入章节，标题都先乱码再逐位“解码”，配合 hover 音效。
- 色散加 bloom 让光流边缘带一点红蓝分离，显得更“科技”。

### 3.3 美学
- 深海军蓝（`rgb(2,10,24)`）单色调加电光蓝，近乎单色。
- 字体：标题用宽体无衬线加大写，UI 用 **Commit Mono** 等宽字体，同样走“系统界面”路线。
- 界面上有边框、角标、细网格线，像 HUD。
- **光流 = 连接 = 合作**：用光的流动做隐喻。这和我们“脉络 = 项目宇宙”的隐喻是同一类。

### 3.4 和我们最相关的点
- **光流（Innovation / Collaboration 段）和我们的 strands 是同一种视觉**，但它的光是由**粒子沿曲线流动**组成，而不是实心管道，所以更有能量感。
- 章节之间是“镜头穿行”，不是“淡出淡入”。
- 文字乱码解码 + UI 音效，成本低，但能让每次翻章都有“事件感”。

---

## 4. 三站横向对比

| 维度 | Oryzo | Aaron | Hubtown | 我们现在 |
|---|---|---|---|---|
| 框架 | Astro | Next.js | Nuxt | Vite + React |
| 渲染 | three r178（魔改）WebGL | three r185 **WebGPU + TSL** | three r179 WebGL2 | three（latest）WebGL |
| 全局画布 | 1 个 fixed | 1 个 | 1 个 | ✅ 1 个 fixed |
| 滚动模型 | 原生滚动 + sticky 长页 | 劫持滚轮翻章 | Lenis + ScrollTrigger 长页 | ✅ 劫持滚轮翻章（和 Aaron 一样） |
| 镜头编排 | DCC 导出的镜头动画 | 代码插值 | **Theatre.js** 时间线 | 代码关键帧插值 |
| **主角形态随章节变化** | ✅ 同一物体换语境 | ✅ 粒子 morph 6 种形态 | ✅ 场景连续穿行 | ❌ 只变镜头和亮度 |
| 鼠标交互 | hover 手、可玩功能 | 粒子扰动 | 揭示遮罩 | 只有轻微视差 |
| 文字动效 | SplitText scrub | 简单淡入 | 乱码解码 | 整块淡入上移 |
| 后期 | SMAA + Bloom + DOF | TSL bloom | Bloom + 色散 | 无（用 shader 假辉光） |
| 声音 | 有 | 无 | 有，默认关 | 无 |
| 资源体积 | 大（贴图、模型、splat） | **极小（全程序化）** | 大（KTX2、glb、EXR） | 极小 |

**结论**：我们的骨架最接近 **Aaron**（翻章 + 程序化 + 资源少）。所以改造路线应该是“以 Aaron 的粒子 morph 为主干，借 Hubtown 的光流和文字解码，借 Oryzo 的‘每章一个可玩交互’和单一主角叙事”。

---

## 5. 落到我们站：改造 brief（给制作）

### 5.0 不变的约束（来自之前已确认的方向）
- 黑白灰单色站，**唯一的颜色是每个项目的脉冲色**。
- 一页式翻章，不做长页；项目详情继续用浮层卡片。
- 保留 `prefers-reduced-motion` 降级、键盘可达、`inert` 处理。
- 已知坑：之前 `UnrealBloomPass` 在本环境报过 framebuffer 错误，所以后期 bloom 必须做成可选，失败要自动退回 shader 假辉光。

### 5.1 P0：主角形态随章节变化（全局感的核心）
把 strands 从“固定的 4 根管道”升级成**一个粒子化的光丝系统**：
- 每条脉络 = 沿 `CatmullRomCurve3` 分布的 N 个粒子（参考 Hubtown 的光河）。外观仍是线条，但每个粒子沿曲线流动，代替现在 `pulseAt` 的亮带。
- 为每一幕定义一个**目标形态**（参考 Aaron 的 morph）。粒子在翻章时从当前形态插值到下一个形态：

  | 场景 | 形态建议 |
  |---|---|
  | hero | 种子：粒子收缩成一个呼吸的光球 |
  | bundle | 交织：4 束光丝在低处缠绕成麻花 |
  | overview | 四个宇宙：4 条分支展开（就是现在的形态） |
  | project ×4 | 当前项目的分支被拉近、展开成该项目的“签名形态”（例如阅读 = 书页般的层叠波浪，拼读 = 字母点阵，竞品研究 = 网络节点图，Agent = 环形流水线）；其他三条退成暗淡的背景线 |
  | experience / methods / tools / agent-note | 所有粒子重组成一个抽象结构（时间轴线、方法的分层环、工具的网格、与 Agent 协作的双螺旋） |
  | contact | 所有光丝回流、汇聚成一个点，和 hero 首尾呼应 |

- 实现路径（二选一，由制作评估后定）：
  - **A. WebGPU + TSL compute**（Aaron 的做法）：粒子位置放在 `StorageBufferAttribute` 里，用 compute shader 做 morph 和扰动；带 `forceWebGL` 回退。上限高，但 three 的 WebGPU 路径 API 还在变，需要锁版本（`package.json` 现在是 `three: latest`，要改成固定版本）。
  - **B. WebGL + 顶点着色器 morph**：每个形态预先算成一个 Float32Array，作为 attribute（`aFrom`/`aTo`）传进去，在 vertex shader 里按 `uMorph` 插值。粒子数控制在 5–10 万。稳定，兼容现有代码。
  - **建议先做 B**，跑通形态表和过渡节奏，再评估要不要升级到 A。

### 5.2 P0：鼠标或触摸扰动（全局可交互）
- 所有场景都能用鼠标“拨动”光丝：指针在世界空间投影出一个半径，范围内的粒子被推开，再用弹簧回到原位（参考 Aaron 的 “MOVE TO DISTURB”）。
- 移动端：手指拖动时做同样的扰动。
- 现在的指针视差保留，扰动叠加在上面。

### 5.3 P1：每一幕一个专属交互（参考 Oryzo）
每个 project 场景放一个 10 秒内能玩完的小交互，直接放在舞台上，不进浮层：
- 悦读小达人：拖动一个滑杆，看游戏化前后的指标曲线实时变化（数据已经在 `yuedu-metrics.json` 里）。
- 单词拼读王：鼠标 hover 字母粒子，字母拼合成单词。
- 竞品研究：hover 节点，显示竞品之间的连线（可复用 `demos/research-map.html` 的数据）。
- Agent 工作流：点一下，看一条 pulse 沿环形流水线跑一圈，依次点亮每个步骤。
（具体玩法由制作和我再细化；原则是“能上手，且和项目内容直接相关”。）

### 5.4 P1：文字统一的入场语言
- 标题：**乱码解码**（参考 Hubtown），每次进场景播放一次，用项目色作为解码过程中的高亮。
- 正文：**逐词点亮**（参考 Oryzo 的 SplitText），从灰到白。
- 用 Motion 或自写实现即可，不需要引入 GSAP。
- UI 编号统一为 `//01` 这种等宽格式，配一个等宽字体（JetBrains Mono 或 Commit Mono），和现有的无衬线标题形成对比（参考 Aaron 和 Hubtown 的 HUD 气质）。

### 5.5 P2：氛围层
- 可选 bloom：用 three 的 `EffectComposer` 加 `UnrealBloomPass`，或 TSL `bloom()`。初始化失败就回退到现有的 shader 假辉光。
- 轻微色散（chromatic aberration），只在翻章过渡的 0.5 秒内加强。
- 声音（可选，默认关）：翻章一个低频“嗡”，hover 一个短促的电流声。参考 Hubtown 的音效清单。
- 场景过渡时镜头做“穿行”而不是平移：中间帧的镜头路径穿过光丝之间（参考 Hubtown）。

### 5.6 技术注意事项
- `package.json` 里 `three`、`react` 等都是 `latest`，**必须先锁定版本**，否则 WebGPU 和 TSL 的 API 变化会让构建随机挂掉。
- 粒子数要按设备分级：桌面 8–10 万；移动端 2–3 万；`reduced-motion` 时不做 morph，直接切换到目标形态。
- 继续保持“预计算数据 + 轻量实时渲染”的原则：形态数据在初始化时一次性算好，或者放进 `strands.js` 那样的配置文件。
- 验收：Chrome、Safari、手机都能稳定 60fps；首屏 JS 增量不超过 150 KB（gzip）；`npm test` 和 `npm run lint` 通过。

---

## 附：原站链接
- Oryzo — https://oryzo.ai
- Aaron J. Cunningham — https://www.aaronjcunningham.com
- Hubtown — https://hubtown.co.in
- Awwwards 页面 — https://www.awwwards.com/sites/aaron-j-cunningham
