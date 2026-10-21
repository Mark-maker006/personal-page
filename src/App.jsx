import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Moon,
  Sun,
  Menu,
  X,
  Plus,
  Check,
  Download,
  GitBranch,
} from "lucide-react";
import { asset, projects, methods } from "./content";
import {
  ParticleField,
  resetPointer,
  trackPointer,
  usePageMotion,
  useReducedMotion,
} from "./motion";
import metrics from "../public/assets/cases/yuedu-metrics.json";

const resume = `${import.meta.env.BASE_URL}resume.html`;
function initialTheme() {
  try {
    const saved = localStorage.getItem("portfolio-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* 隐私模式禁用存储时继续使用系统主题。 */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function Header({ theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Mark 首页">
        MARK<span>.</span>
      </a>
      <nav aria-label="主导航" className={open ? "nav-open" : ""}>
        {[
          ["work", "精选作品"],
          ["impact", "数据与验证"],
          ["about", "关于"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <button
          className="icon-button theme-toggle"
          aria-label={`切换为${theme === "light" ? "暗" : "亮"}色`}
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon /> : <Sun />}
        </button>
        <a
          className="resume-link"
          href={resume}
          target="_blank"
          rel="noreferrer"
        >
          简历 <ArrowUpRight size={15} />
        </a>
        <button
          className="icon-button mobile-menu"
          aria-label="打开导航"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
function Hero({ reduced, onOpen }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-english">Product thinker. Agent builder.</p>
        <h1 id="hero-title">
          让复杂的产品，
          <br />
          变得清楚、可用<span>。</span>
        </h1>
        <p className="hero-description">
          从真实问题出发，用产品判断连接体验与业务。
          <br className="desktop-break" />
          借助 Agent，把想法推进到可验证的作品。
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#work">
            查看作品 <ArrowDown size={17} />
          </a>
          <a
            className="text-link"
            href={resume}
            target="_blank"
            rel="noreferrer"
          >
            <em>Resume</em> <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
      <button
        className="hero-stage"
        aria-label="预览悦读小达人案例"
        onClick={onOpen}
        onPointerMove={(e) => trackPointer(e, reduced)}
        onPointerLeave={resetPointer}
      >
        <div className="hero-plane" />
        <ParticleField reduced={reduced} />
        <span className="stage-label">
          <em>Learning, made tangible.</em>
          <ArrowUpRight size={17} />
        </span>
        <div className="phone hero-phone">
          <img
            src={asset("yuedu-room.webp")}
            alt="悦读小达人真实历史原型：阅读小屋新手引导"
            fetchPriority="high"
          />
        </div>
        <span className="stage-caption">
          <span className="status-dot" /> 悦读小达人 · 阅读小屋原型{" "}
          <Plus size={16} />
        </span>
      </button>
      <div className="hero-bottom">
        <span>产品策略 / 交互设计 / AI 工作流</span>
        <a href="#work">
          <em>Scroll to explore</em> <ArrowDown size={14} />
        </a>
      </div>
    </section>
  );
}
function SectionHeading({ number, english, title, children }) {
  return (
    <div className="section-heading" data-reveal>
      <div className="section-index">
        <em>{number}</em>
        <span>{english}</span>
      </div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
function ProjectCard({ project, featured, reduced, open }) {
  return (
    <button
      className={`project-card ${featured ? "featured" : ""}`}
      aria-label={`查看${project.id === "reading" ? "悦读小达人" : project.title}项目`}
      onClick={open}
      onPointerMove={(e) => trackPointer(e, reduced)}
      onPointerLeave={resetPointer}
      data-reveal
    >
      <div className={`project-media media-${project.id}`}>
        {featured ? (
          <div className="phone-triptych">
            {["yuedu-map.webp", "yuedu-room.webp", "yuedu-inventory.webp"].map(
              (file, i) => (
                <div className={`phone phone-${i}`} key={file}>
                  <img
                    src={asset(file)}
                    alt={project.images.find((image) => image[0] === file)?.[1]}
                    loading="lazy"
                  />
                </div>
              ),
            )}
          </div>
        ) : (
          <img
            src={asset(project.cover)}
            alt={project.images[0][1]}
            loading="lazy"
          />
        )}
        <span className="media-note">
          {project.id === "agent" ? "真实动作预览 / 2s" : "真实项目产物"}
        </span>
      </div>
      <div className="project-info">
        <span className="project-category">{project.category}</span>
        <h3>
          <em>{project.number}</em>
          {project.title}
        </h3>
        <p className="project-subtitle">{project.subtitle}</p>
        {featured ? (
          <dl>
            <div>
              <dt>场景</dt>
              <dd>儿童阅读的持续动力与成长反馈</dd>
            </div>
            <div>
              <dt>判断</dt>
              <dd>围绕学习目标设计空间装扮闭环</dd>
            </div>
            <div>
              <dt>验证</dt>
              <dd>需求、原型、验收与友盟数据复盘</dd>
            </div>
          </dl>
        ) : (
          <p className="project-summary">{project.summary}</p>
        )}
        <span className="project-cta">
          阅读案例{" "}
          <span className="round-arrow">
            <ArrowUpRight size={20} />
          </span>
        </span>
      </div>
    </button>
  );
}
function ProjectDialog({ project, close }) {
  const dialog = useRef(null);
  const [image, setImage] = useState(0);
  useEffect(() => {
    const node = dialog.current,
      previousFocus = document.activeElement;
    node.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-top">
          <span>{project.category}</span>
          <button
            className="icon-button"
            aria-label="关闭项目详情"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <h2 id="dialog-title">{project.title}</h2>
        <p className="dialog-subtitle">{project.subtitle}</p>
        <div className={`gallery gallery-${project.id}`}>
          <img
            src={asset(project.images[image][0])}
            alt={project.images[image][1]}
          />
          <p>{project.images[image][1]}</p>
        </div>
        <div className="gallery-select" aria-label="项目图片">
          {project.images.map(([file, caption], i) => (
            <button
              aria-pressed={image === i}
              key={file}
              onClick={() => setImage(i)}
            >
              <img src={asset(file)} alt="" />
              {caption.split(" · ")[0]}
            </button>
          ))}
        </div>
        <div className="case-narrative">
          {[
            ["01 / 问题", "真正要解决什么", project.context],
            ["02 / 取舍", "为什么这样做", project.decision],
            ["03 / 验证", "如何判断完成", project.verification],
          ].map(([label, title, text]) => (
            <div key={label}>
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <h3 className="challenge-title">困难与解决</h3>
        <div className="challenges">
          {project.challenges.map(([problem, solution]) => (
            <div key={problem}>
              <h4>{problem}</h4>
              <p>
                <Check size={16} />
                {solution}
              </p>
            </div>
          ))}
        </div>
        {project.id === "agent" && (
          <div className="video-evidence">
            <h3>实际两秒动作预览</h3>
            <video
              controls
              playsInline
              preload="none"
              poster={asset("agent-keyframes.webp")}
              src={asset("agent-motion-preview.mp4")}
            />
            <a
              className="text-link"
              href={asset("agent-motion-preview.json")}
              download
            >
              Lottie 源文件 <Download size={16} />
            </a>
          </div>
        )}
        <p className="boundary">{project.boundary}</p>
        <div className="dialog-links">
          <a
            className="button secondary"
            href={asset(
              `${project.id === "reading" ? "yuedu" : project.id}-case-notes.md`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            查看项目说明 <ArrowUpRight size={16} />
          </a>
          {project.id === "research" && (
            <a
              className="text-link"
              href={`${import.meta.env.BASE_URL}demos/research-map.html`}
              target="_blank"
              rel="noreferrer"
            >
              打开交互 Demo <ArrowUpRight size={16} />
            </a>
          )}
          {project.id === "reading" && (
            <a href="#impact" className="text-link" onClick={close}>
              查看数据复盘 <ArrowRight size={16} />
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}
function Impact() {
  const [selected, setSelected] = useState(0);
  const active = metrics.metrics[selected];
  const format = (value) =>
    value < 10 ? value.toFixed(2) : Math.round(value).toLocaleString("en-US");
  const selectTab = (event, index) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 3
        : event.key === "ArrowLeft"
          ? (index + 2) % 3
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 2
              : null;
    if (next !== null) {
      event.preventDefault();
      setSelected(next);
      document.getElementById(`metric-tab-${next}`).focus();
    }
  };
  return (
    <section className="impact section" id="impact">
      <SectionHeading
        number="02"
        english="DATA & DECISIONS"
        title="让数据，支持判断。"
      >
        悦读小达人 · 游戏化上线前后观察
      </SectionHeading>
      <div className="impact-layout" data-reveal>
        <div className="impact-context">
          <span className="context-label">Android + iOS / 全 APP / 各 28 天</span>
          <h3>
            增长来自哪里？
            <br />
            先拆规模，再看频次。
          </h3>
          <p>
            启动总量增长的同时，日均活跃也在增长。把分母放回来，才能判断“更多人来了”还是“每个人更常用了”。
          </p>
          <div className="date-windows">
            <div>
              <span>上线前</span>
              <strong>07.07 — 08.03</strong>
            </div>
            <ArrowRight size={20} />
            <div>
              <span>上线后</span>
              <strong>08.04 — 08.31</strong>
            </div>
          </div>
          <small>
            2026 年 · 08.04 正式上线，由本人确认。双端统计合计，未跨端去重。
          </small>
        </div>
        <div className="metric-panel">
          <div role="tablist" aria-label="对比指标" className="metric-tabs">
            {metrics.metrics.map((metric, i) => (
              <button
                key={metric.id}
                id={`metric-tab-${i}`}
                role="tab"
                aria-selected={selected === i}
                aria-controls="metric-content"
                tabIndex={selected === i ? 0 : -1}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => selectTab(e, i)}
              >
                {i === 2 ? "人均启动频次" : metric.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="metric-content"
            aria-labelledby={`metric-tab-${selected}`}
            tabIndex={0}
            key={active.id}
          >
            <div className="metric-head">
              <span>{active.label}</span>
              <strong>
                +{(active.relativeChange * 100).toFixed(2)}
                <small>%</small>
              </strong>
            </div>
            {[
              ["上线前", active.before, "before"],
              ["上线后", active.after, "after"],
            ].map(([label, value, className]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track">
                  <div
                    className={`bar ${className}`}
                    style={{ width: `${(value / active.after) * 100}%` }}
                  />
                </div>
                <strong>{format(value)}</strong>
              </div>
            ))}
            <p className="metric-formula">
              {selected === 2
                ? "窗口总启动次数 ÷ 活跃用户日总和；活跃用户日不是期间去重人数。"
                : `各窗口双端每日${selected === 0 ? "活跃用户" : "启动次数"}求和 ÷ 28 个自然日。`}
            </p>
          </div>
        </div>
      </div>
      <div className="data-takeaways" data-reveal>
        {/* 结论卡与指标图共用新报表聚合值，避免文案保留旧口径。 */}
        {metrics.metrics.map((metric) => (
          <div key={metric.id}>
            <em>+{(metric.relativeChange * 100).toFixed(2)}%</em>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className="data-insight" data-reveal>
        <div>
          <h3>观察 ≠ 因果</h3>
          <p>
            上线后活跃规模扩大，人均启动频次增幅较小。同期新增用户减少 15.69%，新用户 D7 留存从 20.70% 到 22.69%（+1.99 个百分点）。悦读当时没有 A/B 测试，不能把变化直接归因于游戏化；渠道、假期和版本都可能影响结果。
          </p>
        </div>
        <div>
          <h3>下一步验证什么</h3>
          <p>
            先核对 iOS 埋点：首个 28 天的“去阅读点击”只有 16 天记录。补齐版本、用户标识和事件顺序后，再验证入口触达 → 小屋参与 → 去阅读 → 阅读完成，检查激励是否回到学习。
          </p>
        </div>
      </div>
      <details className="source-details">
        <summary>
          数据来源、公式与缺失项 <Plus size={17} />
        </summary>
        <div>
          <p>
            来源：2026.10.19 友盟后台新导出的 Android、iOS 数据，2026.10.20 重算。
            上线前 366,220 活跃用户日 / 1,075,725 次启动；上线后 451,770 活跃用户日 / 1,356,472 次启动。22 张原始 CSV 与 4 张合并表逐字段对账；原始表仅保存在本机。
          </p>
          <p>
            两端分别保留：Android 日均活跃 +24.30%，iOS +20.59%。新用户留存按成熟批次人数加权，D1 / D7 / D14 / D30 前后每端均为 28 个完整批次。事件为日汇总，独立用户跨天之和是用户日；缺失不补零，不能据此计算用户级漏斗。单词拼读王的 A/B 测试是另一案例。
          </p>
          <a
            href={asset("yuedu-metrics.json")}
            target="_blank"
            rel="noreferrer"
          >
            查看聚合数据与计算口径 <ArrowUpRight size={15} />
          </a>
        </div>
      </details>
    </section>
  );
}
function About() {
  return (
    <section className="about section" id="about">
      <SectionHeading
        number="03"
        english="HOW I WORK"
        title="工具很新，判断要扎实。"
      >
        在真实项目里，练习把复杂问题变成可交付的体验。
      </SectionHeading>
      <div className="method-grid">
        {methods.map(([english, title, text], index) => (
          <article key={english} data-reveal>
            <div>
              <em>0{index + 1}</em>
              <ArrowUpRight size={18} />
            </div>
            <span>{english}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="about-note" data-reveal>
        <h3>我与 Agent 的分工</h3>
        <p>
          让 Agent
          做检索、方案探索、代码与重复整理。我负责问题定义、关键取舍与结果验收。遇到跨产品混用、规则漂移或“技术通过但体验不对”，就把失败写成下一轮可执行的约束。
        </p>
        <a
          className="text-link"
          href={asset("case-notes.md")}
          target="_blank"
          rel="noreferrer"
        >
          阅读案例与复盘说明 <ArrowUpRight size={17} />
        </a>
      </div>
    </section>
  );
}
export default function App() {
  const [theme, setTheme] = useState(initialTheme),
    [project, setProject] = useState(null);
  const reduced = useReducedMotion();
  usePageMotion(reduced);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#ffffff" : "#171719");
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* 禁用存储时本次访问仍可正常切换。 */
    }
  }, [theme]);
  return (
    <>
      <a className="skip-link" href="#work">
        跳到作品
      </a>
      <div className="scroll-progress" />
      <div className="site-shell" id="top">
        <Header
          theme={theme}
          toggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        />
        <main>
          <Hero reduced={reduced} onOpen={() => setProject(projects[0])} />
          <section className="work section" id="work">
            <SectionHeading
              number="01"
              english="SELECTED WORK"
              title="把想法，推进到可验证的作品。"
            >
              两款负责的教育产品，以及研究与 Agent 工作流实践。
            </SectionHeading>
            <div className="project-grid">
              {projects.map((item, i) => (
                <ProjectCard
                  key={item.id}
                  project={item}
                  featured={i === 0}
                  reduced={reduced}
                  open={() => setProject(item)}
                />
              ))}
            </div>
          </section>
          <Impact />
          <About />
          <section className="contact" data-reveal>
            <div>
              <em>Clarity is a craft.</em>
              <h2>
                下一份作品，
                <br />
                继续从好问题开始。
              </h2>
            </div>
            <div>
              <p>产品经理 / 产品实习 / 产品设计</p>
              <a
                className="button primary"
                href={resume}
                target="_blank"
                rel="noreferrer"
              >
                查看我的简历 <ArrowUpRight size={18} />
              </a>
              <a
                className="text-link pdf-download"
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                download
              >
                下载 PDF <Download size={16} />
              </a>
            </div>
          </section>
        </main>
        <footer>
          <a className="brand" href="#top">
            MARK<span>.</span>
          </a>
          <span>Product, design & a little curiosity.</span>
          <a
            href="https://github.com/Mark-maker006"
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch size={16} />
            GitHub <ArrowUpRight size={14} />
          </a>
          <a href="#top">
            回到顶部 <ArrowUpRight size={14} />
          </a>
        </footer>
      </div>
      {project && (
        <ProjectDialog
          key={project.id}
          project={project}
          close={() => setProject(null)}
        />
      )}
    </>
  );
}
