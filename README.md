# Mark · 产品作品集

线上：<https://mark-maker006.github.io/personal-page/>

React + Vite 静态站，GitHub Pages 从 main 分支自动构建部署。内容覆盖悦读小达人游戏化、竞品研究、Agent 动画工作流，包含真实截图、交互 Demo、动画工作预览与单页简历。

## 开发与验证

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run lint
npm run build
npm test
```

测试需要开发服务器运行在 `http://127.0.0.1:5173/personal-page/`，并安装 Playwright Chromium（`npx playwright install chromium`）。可通过 `TEST_URL` 验证其他部署。

## 内容与来源

- `src/content.js`：案例文字、截图与困难复盘。
- `public/assets/cases/`：精选公开产物、各案例说明、聚合数据。
- `public/demos/research-map.html`：自包含的历史研究原型，页面可交互。
- `public/resume.html`、`public/resume.pdf`：可打印简历与单页 PDF；修改 HTML 后需重新导出 PDF。

数据来自 2026-10-19 通过友盟 U-App 后台及报表中心新导出的 Android、iOS 共 22 张 CSV 统计报表，2026-10-20 逐字段对账并重算。正式上线日 2026-08-04 已由本人确认；比较 2026-07-07—08-03 与 08-04—08-31，各 28 个自然日。双端日均活跃增长 23.36%，日均启动增长 26.10%，每活跃用户日启动增长 2.22%；新增用户减少 15.69%，新用户 D7 留存从 20.70% 到 22.69%（+1.99 个百分点）。两端统计未跨端去重，留存按匹配成熟批次加权。悦读没有 A/B 测试，不能把前后变化直接归因于游戏化。iOS 去阅读点击仅有 16/28 天记录，不能补零或当作用户漏斗。计算口径、分子分母与限制见 `public/assets/cases/yuedu-metrics.json`，案例解释见 `public/assets/cases/yuedu-case-notes.md`。

阅读产品图片是既有交互 Demo 的重新渲染；研究播放图属于竞品实测引用；动画是待人工确认的两秒工作预览。品牌及既有视觉不全部归于本人独立创作。原始会话、账号信息、用户明细与私有本机路径未放入公开站点。

## 视觉与交互

中文优先使用本机 `PingFang SC`，无苹方时回退系统中文字体；拉丁字母和数字使用 `Times New Roman`。不分发字体文件，不依赖 Google Fonts。主题跟随首次访问时的系统偏好，用户切换后本地保存。

设计参考：

- [Rauno Freiberg](https://rauno.me/)：编辑式信息层级与作品作为视觉主体。
- [Emil Kowalski](https://emilkowal.ski/) 与 [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)：快速按压反馈、轻量入场与短交互时长。
- [Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：清晰层级、系统字体与可读性。圆角 12/24/32px 为本站设计 token，不声称是 Apple 的固定标准。

动效包括视差、滚动显现、阅读进度、鼠标微倾斜和柔光、按压与 hover、轻量粒子。支持减少动态偏好、键盘导航、原生模态焦点管理与移动端 44px 触控区。
