import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDownRight,
  ArrowUpRight,
  Asterisk,
  Check,
  Download,
  ExternalLink,
  GitBranch,
  Mail,
  Menu,
  MoveUpRight,
  Sparkles,
  X,
} from 'lucide-react'
import * as THREE from 'three'
import './styles.css'

const baseUrl = import.meta.env.BASE_URL

const caseStudies = [
  {
    id: 'reading',
    number: '01',
    eyebrow: '产品机制 / 交互原型',
    title: '让游戏化真正服务学习',
    short: '悦读小达人 · 从星币、任务到空间装扮的学习反馈闭环',
    accent: 'lime',
    stats: ['儿童学习场景', '多状态原型', '需求 / 测试同步'],
    problem: '学习行为和奖励反馈之间缺少清晰的闭环，Agent 初版又把其他产品的宠物养成机制带入了阅读场景。',
    method: '先收敛“空间装扮”定位，再拆出今日学习收获、长期可消费余额、任务容量和家具状态，让每个反馈都回到学习目标。',
    proof: '形成 PRD、可交互原型、底部导航方案与测试口径；对新手期和奖励规则保留版本边界。',
  },
  {
    id: 'research',
    number: '02',
    eyebrow: '体验研究 / 决策材料',
    title: '把竞品观察变成我方决策',
    short: '绘本学习产品 · 实机走查、状态矩阵与可追溯证据',
    accent: 'coral',
    stats: ['游客 / 会员状态', 'ADB 实机路径', '截图嵌入结论'],
    problem: '研究报告容易停留在功能罗列，截图堆在文末，甚至不小心变成给竞品写改进建议。',
    method: '按用户状态和实际路径走查，用“证据—机制—我方借鉴边界—验证指标”重排材料，明确深测范围和未完成部分。',
    proof: '记录了断点续播链路不完整等真实观察，并把结论重新落到我方产品重构优先级。',
  },
  {
    id: 'agent',
    number: '03',
    eyebrow: 'AI 工具 / 工作流设计',
    title: '把失败经验写进工具',
    short: 'Agent 驱动的动画制作 · 长任务恢复、透明度与节奏验收',
    accent: 'blue',
    stats: ['任务 ID 恢复', 'alpha / 格式检查', '技术 + 运动双验收'],
    problem: '跨工具搬运素材、长任务超时、透明 WebM 丢 alpha，以及“技术通过但动作不对”反复出现。',
    method: '把提交和查询拆开，保留任务 ID；把输入职责、阶段产物、恢复方式和三类验收标准写成可复用流程。',
    proof: '完成插件初版和两秒动作预览；诚实保留跨素材稳定性与正式交付仍需确认的边界。',
  },
]

const capabilityRows = [
  ['01', '问题定义', '从用户场景、业务约束和证据边界开始，收敛真正要解决的问题。'],
  ['02', '体验设计', '把状态、路径、反馈和异常一起设计，做出能被验收的交互原型。'],
  ['03', 'AI 协作', '让 Agent 负责重复劳动和探索，把判断、取舍和验收留在产品工作里。'],
  ['04', '验证交付', '用数据口径、实机路径和回归清单，把“看起来完成”变成可复核结果。'],
]

const processSteps = [
  { label: 'Observe', title: '先找真实摩擦', body: '用户卡在哪里，团队为什么反复返工，数据缺的究竟是哪一维。' },
  { label: 'Frame', title: '把边界写清楚', body: '区分事实、假设和待验证项，把复杂问题压成可讨论的最小闭环。' },
  { label: 'Make', title: '快速做出可点版本', body: '用原型、脚本和 Agent 工作流把抽象判断变成可观察的体验。' },
  { label: 'Prove', title: '把验收放回现场', body: '重新走入口、看状态、核数据、查回归，记录通过与未完成的部分。' },
]

function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return progress
}

function ParticleField() {
  const canvasRef = useRef(null)
  useEffect(() => {
    // 使用轻量 Canvas 粒子层装饰背景，避免移动端创建过多 DOM 节点。
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let frame = 0
    let width = 0
    let height = 0
    const points = Array.from({ length: 72 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.8,
      speed: 0.00015 + Math.random() * 0.00035,
      offset: index * 17,
    }))

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * scale
      canvas.height = height * scale
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }

    const paint = (time) => {
      context.clearRect(0, 0, width, height)
      for (const point of points) {
        const drift = (time * point.speed + point.offset / 1000) % 1
        const x = ((point.x * width) + drift * 18) % width
        const y = point.y * height + Math.sin(time * 0.0003 + point.offset) * 12
        const alpha = 0.16 + Math.sin(time * 0.001 + point.offset) * 0.08
        context.beginPath()
        context.fillStyle = `rgba(157, 239, 208, ${alpha})`
        context.arc(x, y, point.size, 0, Math.PI * 2)
        context.fill()
      }
      frame = requestAnimationFrame(paint)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
}

function OrbitalScene() {
  const mountRef = useRef(null)
  useEffect(() => {
    // Three.js 只负责低成本的轨道线框，内容和交互仍由 DOM 承载。
    const mount = mountRef.current
    if (!mount) return undefined
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.z = 7
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)
    const geometry = new THREE.IcosahedronGeometry(1.22, 2)
    const material = new THREE.MeshBasicMaterial({ color: 0x8cf3ce, wireframe: true, transparent: true, opacity: 0.14 })
    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)

    const ringGeometry = new THREE.TorusGeometry(1.72, 0.009, 8, 160)
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x79a8ff, transparent: true, opacity: 0.55 })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2.6
    group.add(ring)

    const resize = () => {
      const rect = mount.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)
    let frame = 0
    const animate = (time) => {
      group.rotation.y = time * 0.00018
      group.rotation.x = Math.sin(time * 0.00017) * 0.12
      ring.rotation.z = time * 0.00024
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      ringGeometry.dispose()
      ringMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])
  return <div ref={mountRef} className="orbital-scene" aria-hidden="true" />
}

function CursorGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  useEffect(() => {
    const onMove = (event) => setPosition({ x: event.clientX, y: event.clientY })
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return <div className="cursor-glow" style={{ transform: `translate3d(${position.x - 180}px, ${position.y - 180}px, 0)` }} aria-hidden="true" />
}

function App() {
  const progress = useScrollProgress()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeCase, setActiveCase] = useState('reading')
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const activeStudy = useMemo(() => caseStudies.find((item) => item.id === activeCase) || caseStudies[0], [activeCase])

  useEffect(() => {
    const onMove = (event) => {
      setPointer({ x: (event.clientX / window.innerWidth - 0.5) * 2, y: (event.clientY / window.innerHeight - 0.5) * 2 })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileNavOpen(false)
  }

  return (
    <div className="site-shell">
      <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />
      <ParticleField />
      <CursorGlow />
      <header className="site-header">
        <button className="brand-mark" onClick={() => goTo('top')} aria-label="回到顶部">
          <span className="brand-dot" />
          <span>MARK / 26</span>
        </button>
        <nav className={mobileNavOpen ? 'site-nav is-open' : 'site-nav'} aria-label="主导航">
          <button onClick={() => goTo('work')}>Work</button>
          <button onClick={() => goTo('method')}>Method</button>
          <button onClick={() => goTo('resume')}>Resume</button>
          <a href="mailto:hello@mark-product.design">Contact</a>
        </nav>
        <button className="icon-button menu-button" onClick={() => setMobileNavOpen((value) => !value)} aria-label={mobileNavOpen ? '关闭菜单' : '打开菜单'}>
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-media" style={{ transform: `translate3d(${pointer.x * -10}px, ${pointer.y * -7}px, 0)` }}>
            <img src={`${baseUrl}assets/hero-workbench.png`} alt="抽象的数字产品工作台" />
          </div>
          <div className="hero-copy">
            <div className="hero-index"><span>01</span><span className="line" /><span>Product / Design / Systems</span></div>
            <h1>把复杂问题，<br /><em>做成可用的体验。</em></h1>
            <p className="hero-lede">我是 Mark，关注教育产品、交互原型和 AI 辅助工作流。把用户问题、团队约束与可验证的结果放在同一张桌面上。</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => goTo('work')}>进入作品 <ArrowDownRight size={16} /></button>
              <a className="button button-quiet" href={`${baseUrl}resume.html`}>查看简历 <ArrowUpRight size={16} /></a>
            </div>
          </div>
          <div className="hero-orbit" style={{ transform: `translate3d(${pointer.x * 16}px, ${pointer.y * 12}px, 0)` }}>
            <OrbitalScene />
            <div className="orbit-label"><span>NOW EXPLORING</span><strong>AI × PRODUCT CRAFT</strong></div>
          </div>
          <div className="hero-footer"><span>Scroll to inspect the work</span><span className="scroll-arrow"><ArrowDownRight size={15} /></span><span>Shanghai / remote</span></div>
        </section>

        <section className="signal-band" aria-label="工作标签">
          <div className="signal-track"><span>PRODUCT THINKING</span><Asterisk size={15} /><span>INTERACTION SYSTEMS</span><Asterisk size={15} /><span>AI-ASSISTED WORKFLOWS</span><Asterisk size={15} /><span>PRODUCT THINKING</span><Asterisk size={15} /><span>INTERACTION SYSTEMS</span></div>
        </section>

        <section className="intro section-wrap" id="about">
          <div className="section-kicker"><span>02 / ABOUT</span><span className="kicker-rule" /></div>
          <div className="intro-grid">
            <h2>不把 Agent 当成<br /><span>魔法按钮。</span></h2>
            <div className="intro-copy"><p>我更关心的是：它是否让判断变得更清楚，让交付变得更可复核。</p><p>过去几个月，我在阅读产品、竞品研究、Figma 原型和动画工作流之间来回切换。每一次偏差都被记录成下一次的检查项。</p><button className="text-link" onClick={() => goTo('method')}>看我的工作方法 <MoveUpRight size={15} /></button></div>
          </div>
          <div className="capability-list">{capabilityRows.map(([number, title, text]) => <div className="capability-row" key={number}><span className="row-number">{number}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight className="row-arrow" size={18} /></div>)}</div>
        </section>

        <section className="work section-wrap" id="work">
          <div className="section-kicker"><span>03 / SELECTED WORK</span><span className="kicker-rule" /><span className="kicker-meta">{String(caseStudies.length).padStart(2, '0')} CASES</span></div>
          <div className="work-heading"><h2>把判断留在<br /><span>画面里。</span></h2><p>三条工作线，都是从具体摩擦开始，再回到可验证的体验。</p></div>
          <div className="case-layout">
            <div className="case-tabs" role="tablist" aria-label="作品案例">
              {caseStudies.map((study) => <button key={study.id} className={activeCase === study.id ? `case-tab is-active ${study.accent}` : 'case-tab'} onClick={() => setActiveCase(study.id)} role="tab" aria-selected={activeCase === study.id}><span>{study.number}</span><strong>{study.title}</strong><small>{study.short}</small><ArrowUpRight size={16} /></button>)}
            </div>
            <article className={`case-detail ${activeStudy.accent}`}>
              <div className="case-detail-top"><span>{activeStudy.eyebrow}</span><span>CASE / {activeStudy.number}</span></div>
              <h3>{activeStudy.title}</h3>
              <div className="case-stats">{activeStudy.stats.map((stat) => <span key={stat}><Check size={13} />{stat}</span>)}</div>
              <div className="case-detail-copy"><div><small>THE FRICTION</small><p>{activeStudy.problem}</p></div><div><small>THE MOVE</small><p>{activeStudy.method}</p></div><div><small>THE EVIDENCE</small><p>{activeStudy.proof}</p></div></div>
              <div className="case-detail-footer"><span>完整复盘会包含：问题、取舍、原型、验证和边界</span><button className="icon-button" aria-label="打开案例详情"><ExternalLink size={17} /></button></div>
            </article>
          </div>
        </section>

        <section className="method section-wrap" id="method">
          <div className="section-kicker"><span>04 / METHOD</span><span className="kicker-rule" /></div>
          <div className="method-heading"><h2>从观察开始，<br /><span>到验收结束。</span></h2><p>好的协作不是把判断交给工具，而是让每一步判断都留下痕迹。</p></div>
          <div className="process-rail">{processSteps.map((step, index) => <div className="process-step" key={step.label}><span className="process-index">0{index + 1}</span><span className="process-label">{step.label}</span><h3>{step.title}</h3><p>{step.body}</p>{index < processSteps.length - 1 && <span className="process-link" aria-hidden="true" />}</div>)}</div>
          <div className="method-note"><Sparkles size={18} /><p>我会明确写下未完成的部分：没有验证过的留存提升，不写成结果；没有真实接入的数据，不写成上线。</p></div>
        </section>

        <section className="evidence section-wrap">
          <div className="evidence-panel"><div className="evidence-orbit" /><div className="evidence-copy"><span className="section-label">05 / EVIDENCE LOG</span><h2>困难不是备注，<br /><span>是产品能力。</span></h2><p>从奖励规则冲突、竞品走查偏题，到透明素材变白底、动画动作不连贯，我把反复出现的问题整理成判断和验收方法。</p><button className="button button-outline" onClick={() => goTo('resume')}>打开工作日志 <ArrowUpRight size={16} /></button></div><div className="evidence-list"><div><strong>01</strong><span>事实 / 假设 / 待验证</span></div><div><strong>02</strong><span>路径 / 状态 / 结果</span></div><div><strong>03</strong><span>输入 / 产物 / 恢复</span></div><div><strong>04</strong><span>完成 / 部分完成 / 未完成</span></div></div></div>
        </section>

        <section className="resume section-wrap" id="resume">
          <div className="section-kicker"><span>06 / RESUME</span><span className="kicker-rule" /><a href={`${baseUrl}resume.html`}>Print version <ArrowUpRight size={14} /></a></div>
          <div className="resume-grid"><div><h2>现在，<br /><span>一起做点难的。</span></h2><p className="resume-lede">寻找产品经理、产品实习或产品设计方向的机会。擅长把开放问题整理成能讨论、能试做、能验收的东西。</p><a className="button button-primary" href="mailto:hello@mark-product.design">发一封邮件 <Mail size={16} /></a></div><div className="resume-facts"><div className="fact"><span>FOCUS</span><strong>Learning products<br />Interaction systems<br />AI workflows</strong></div><div className="fact"><span>TOOLKIT</span><strong>Figma / React / Three.js<br />Agent workflows / Data framing<br />Prototype / QA</strong></div><div className="fact"><span>BASED IN</span><strong>China · open to remote</strong></div></div></div>
          <footer className="site-footer"><span>© 2026 Mark. Built with curiosity and checks.</span><div><a href="https://github.com/Mark-maker006/personal-page" target="_blank" rel="noreferrer"><GitBranch size={16} /> GitHub</a><a href="mailto:hello@mark-product.design"><Mail size={16} /> Email</a><a href={`${baseUrl}resume.html`}><Download size={16} /> Resume</a></div></footer>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
