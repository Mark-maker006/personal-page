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

数据来自友盟历史离线导出：2026-07-18—08-03 与 08-04—08-20，各 17 天，Android 全 APP。日均活跃增长 17.08%，日均启动增长 19.04%，每活跃用户日启动增长 1.68%。这是前后观察，不能直接归因为游戏化效果。08.04 是分析后窗起点，正式发版日期未确认。计算口径与限制见 `yuedu-metrics.json`。

阅读产品图片是既有交互 Demo 的重新渲染；研究播放图属于竞品实测引用；动画是待人工确认的两秒工作预览。品牌及既有视觉不全部归于本人独立创作。原始会话、账号信息、用户明细与私有本机路径未放入公开站点。

## 视觉与交互

中文优先使用本机 `PingFang SC`，无苹方时回退系统中文字体；拉丁字母和数字使用 `Times New Roman`。不分发字体文件，不依赖 Google Fonts。主题跟随首次访问时的系统偏好，用户切换后本地保存。

设计参考：

- [Rauno Freiberg](https://rauno.me/)：编辑式信息层级与作品作为视觉主体。
- [Emil Kowalski](https://emilkowal.ski/) 与 [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)：快速按压反馈、轻量入场与短交互时长。
- [Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：清晰层级、系统字体与可读性。圆角 12/24/32px 为本站设计 token，不声称是 Apple 的固定标准。

动效包括视差、滚动显现、阅读进度、鼠标微倾斜和柔光、按压与 hover、轻量粒子。支持减少动态偏好、键盘导航、原生模态焦点管理与移动端 44px 触控区。
