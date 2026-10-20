export const asset = (file) =>
  `${import.meta.env.BASE_URL}assets/cases/${file}`;
// 真实产物、历史原型与上线效果分别标注，避免跨版本拼接。
export const projects = [
  {
    id: "reading",
    number: "01",
    title: "悦读小达人",
    category: "Product strategy / Gamification",
    subtitle: "让一次阅读，成为下一次的期待。",
    summary: "围绕星币、任务与空间装扮，把学习行为连接到可感知的成长反馈。",
    cover: "yuedu-room.webp",
    images: [
      ["yuedu-room.webp", "阅读小屋 · 新手引导状态"],
      ["yuedu-map.webp", "关卡地图 · 历史交互原型"],
      ["yuedu-inventory.webp", "家具背包 · 物品放置选择"],
      ["yuedu-navigation.webp", "底部导航 · 方案对比"],
    ],
    context:
      "儿童阅读产品的激励不能只增加热闹，还要让孩子理解“为什么阅读、读完获得什么、奖励如何使用”。",
    decision:
      "收敛到空间装扮的反馈闭环，区分今日学习收获与长期可消费星币，明确任务容量、物品状态和奖励边界。",
    verification:
      "串联需求、可点击原型与验收口径；重新导出友盟双端数据，按各 28 天比较上线前后的规模、频次和成熟批次留存。",
    challenges: [
      [
        "Agent 混入其他产品的宠物机制",
        "先锁定产品、版本与核心目标，再按空间装扮机制生成方案；每轮检查机制是否回到阅读。",
      ],
      [
        "规则在 PRD、原型、测试间不一致",
        "将任务容量、奖励上限、新手状态整理成同一状态表，再同步修改三类产物。",
      ],
      [
        "总量增长容易被当成功能效果",
        "同时比较活跃规模和人均频次，标明平台、窗口、版本与缺失事件，保留非因果边界。",
      ],
    ],
    boundary:
      "此处展示的是留存的设计与交互原型。数据为 Android 与 iOS 全 APP 前后观察，双端未跨端去重，不能据此把增长归因于小屋功能。",
  },
  {
    id: "research",
    number: "02",
    title: "从竞品观察到产品判断",
    category: "Research / Product decisions",
    subtitle: "让每一个结论，都有来处。",
    summary: "实机路径、用户状态与截图证据，组织成能支持我方取舍的研究材料。",
    cover: "research-market-map.webp",
    images: [
      ["research-market-map.webp", "绘本学习产品 · 竞品市场地图原型"],
      ["research-access-flow.webp", "用户访问路径 · 状态与权限分析"],
      ["research-playback.webp", "叫叫 App · 历史实机走查（竞品引用）"],
    ],
    context:
      "功能罗列和成堆截图很难回答产品经理最关心的问题：我方究竟应该借鉴什么，又应该放弃什么？",
    decision:
      "按游客、非会员、会员等状态拆解实际路径，将“证据 → 机制 → 我方借鉴边界 → 验证指标”放在同一阅读单元。",
    verification:
      "用实机截图、市场地图与路径图回查结论；对没有完成的深测明确标记，避免以推测补齐功能。",
    challenges: [
      [
        "研究写成了给竞品的改进建议",
        "把结论改写为我方的机会、约束、优先级与验证方式，让报告服务决策。",
      ],
      [
        "游客和会员体验混在一起",
        "建立用户状态矩阵，截图与结论绑定同一账号状态和操作路径。",
      ],
      [
        "页面看过了，链路却没走完",
        "用 ADB 与实机复核入口、播放和返回路径，区分已验证、部分验证与未覆盖。",
      ],
    ],
    boundary:
      "竞品截图用于研究引用；市场地图和流程图是研究产物，不代表我方已上线功能。",
  },
  {
    id: "agent",
    number: "03",
    title: "Agent 动画工作流",
    category: "AI workflow / Creative tooling",
    subtitle: "把一次次失败，变成下一次的工具。",
    summary:
      "从长任务恢复到动作验收，把跨工具制作过程变成可追踪、可复用的流程。",
    cover: "agent-keyframes.webp",
    images: [
      ["agent-keyframes.webp", "两秒动作预览 · 实际关键帧"],
      ["agent-creator.webp", "Lottie Creator · 真实制作界面"],
    ],
    context:
      "长任务超时、透明素材丢失 alpha、格式正确却动作不对，让动画交付反复返工。",
    decision:
      "拆开提交与查询，保留任务 ID；区分输入职责与阶段产物，把恢复路径和验收规则写进工具流程。",
    verification:
      "完成插件初版与两秒动作预览，从技术可用、动作节奏、参考一致三方面检查。",
    challenges: [
      [
        "长任务超时后重复生成",
        "保留任务 ID，提交与查询分离，从阶段产物继续，避免整条链路重跑。",
      ],
      [
        "透明视频名义支持但实际不透明",
        "检查真实 alpha 分布与透明角点，在深浅两种背景上复核，而不是只看扩展名。",
      ],
      [
        "技术验收通过，动作体验不对",
        "增加关键帧接触表和节奏验收，区分技术通过与运动表现通过。",
      ],
    ],
    boundary: "目前是工具探索与短预览，尚未证明跨素材稳定性或业务效率提升。",
  },
];
export const methods = [
  [
    "Observe",
    "从真实摩擦开始",
    "还原用户的路径、状态和任务，先确认问题真的存在。",
  ],
  [
    "Frame",
    "把判断写清楚",
    "区分事实与假设，明确目标、约束、优先级和放弃的选项。",
  ],
  [
    "Make",
    "让想法可以被点",
    "用原型、文档与 Agent 快速迭代，把规则变成可观察的体验。",
  ],
  [
    "Prove",
    "回到现场验证",
    "核对数据口径、实机路径和回归结果，为下一轮留下证据。",
  ],
];
