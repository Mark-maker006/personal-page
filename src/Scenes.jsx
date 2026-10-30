import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, Download, GitBranch, RotateCw } from "lucide-react";
import { asset, education, experience, methods, projects, sideProjects, skills } from "./content";
import { ProjectPlay, scramble, Words } from "./Playground";

const MultiverseScene = lazy(() => import("./MultiverseScene.jsx"));

const resume = `${import.meta.env.BASE_URL}resume.html`;
const shortTitle = { reading: "悦读小达人", phonics: "单词拼读王", research: "竞品研究", agent: "Agent 工作流" };

// 首页的全部"场景"。页面不再是一条长文档：滚动只推进场景序号，
// 内容在固定的舞台上切换，背景的 3D 脉络随序号连续变化。
export const SCENES = [
  { key: "hero", type: "hero", label: "开始", anchor: "top" },
  { key: "bundle", type: "bundle", label: "交织" },
  { key: "overview", type: "overview", label: "四个宇宙", anchor: "work" },
  ...projects.map((p, i) => ({ key: p.id, type: "project", project: i, label: shortTitle[p.id] })),
  { key: "experience", type: "about", about: 0, label: "经历", anchor: "about" },
  { key: "methods", type: "about", about: 1, label: "方法" },
  { key: "tools", type: "about", about: 2, label: "工具与探索" },
  { key: "agent-note", type: "about", about: 3, label: "与 Agent 协作" },
  { key: "contact", type: "contact", label: "联系", anchor: "contact" },
];

// 环形浏览：联系之后还接着一幕“重新萌发”，形态和镜头与开头完全相同。
const N = SCENES.length;
const LOOP_SCENES = [...SCENES, { ...SCENES[0], key: "rebirth", anchor: undefined, loop: true }];
// 滚动轨道：开头前面多一段（联系的副本），结尾后面多一段（重新萌发）。
// 进度 p 从 -1 连续走到 N，p 与 p ± N 画面完全相同；越过两端时把滚动位置平移一整圈，看不出跳转。
const TRACK = ["pre", ...SCENES.map((sc) => sc.key), "rebirth"];
const SNAP_DELAY = 300;
const SNAP_NUDGE = 0.1;
// 环上的有符号距离
const circ = (d) => d - N * Math.round(d / N);
const smoothstep = (a, b, v) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const placementOf = (scene) =>
  scene.type === "hero" || scene.type === "bundle"
    ? "at-top"
    : scene.type === "overview"
      ? "at-bottom"
      : scene.type === "about" && (scene.about === 1 || scene.about === 2)
        ? "scene-wide"
        : "";

function HeroPanel({ goTo }) {
  return (
    <div className="scene-copy">
      <p className="hero-english">燕山大学 · 设计学硕士在读 · 2027 届</p>
      <h1 id="hero-title">
        让复杂的产品，
        <br />
        变得清楚、可用。
      </h1>
      <p className="hero-description">
        在杭州雪梨教育参与两款教育产品，从需求到原型到数据验收。
        <br className="desktop-break" />
        借助 Agent，把判断推进到可交付的作品。
      </p>
      <div className="hero-actions">
        <button type="button" className="button primary enter-button" onClick={() => goTo(2)}>
          进入作品宇宙 <ArrowRight size={17} />
        </button>
        <a className="text-link" href={resume} target="_blank" rel="noreferrer">
          <em>Resume</em> <ArrowUpRight size={18} />
        </a>
      </div>
    </div>
  );
}

function BundlePanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>One question, many timelines.</em>
      </p>
      <h2>所有项目，都从同一个问题出发。</h2>
      <p className="scene-text">
        <Words text="怎样把复杂的东西，变成用户看得懂、用得上的体验。接下来的四条线，是这个问题在不同产品里的四种回答。" />
      </p>
    </div>
  );
}

function OverviewPanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>Four projects, four timelines.</em>
      </p>
      <h2>把想法，推进到可验证的作品。</h2>
      <p className="scene-text">
        <Words text="两款负责的教育产品，以及研究与 Agent 工作流实践。点击任意一个宇宙，或继续向下滚动逐个浏览。" />
      </p>
    </div>
  );
}

function ProjectPanel({ project, onOpen, reduced }) {
  return (
    <div className="scene-copy project-copy" style={{ "--strand": project.color }}>
      <p className="scene-kicker">
        <em className="hud">//{project.number}</em>
        <span>/ 04 · {project.category}</span>
      </p>
      <h2>{project.title}</h2>
      <p className="scene-subtitle">
        <Words text={project.subtitle} />
      </p>
      <p className="scene-text">
        <Words text={project.summary} />
      </p>
      <ProjectPlay project={project} reduced={reduced} />
      <button
        type="button"
        className="button primary"
        aria-label={`查看${project.title}项目`}
        onClick={() => onOpen(project.id)}
      >
        阅读案例 <ArrowUpRight size={17} />
      </button>
    </div>
  );
}

function ExperiencePanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>How I work</em>
      </p>
      <h2>工具很新，判断要扎实。</h2>
      <div className="about-timeline">
        <div className="timeline-item">
          <span className="timeline-period">{experience.period}</span>
          <div className="timeline-body">
            <h3>
              {experience.company} <em>· {experience.role}</em>
            </h3>
            <p>{experience.desc}</p>
          </div>
        </div>
        <div className="timeline-item">
          <span className="timeline-period">{education.period}</span>
          <div className="timeline-body">
            <h3>
              {education.school} <em>· {education.degree}</em>
            </h3>
            <p>设计学背景，兼修产品方法、交互设计与数据思维。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodsPanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>Working method</em>
      </p>
      <h2>工作方法</h2>
      <div className="method-grid">
        {methods.map(([english, title, text], index) => (
          <article key={english}>
            <span>
              <em>0{index + 1}</em> {english}
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToolsPanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>Tools & side quests</em>
      </p>
      <h2>工具与探索</h2>
      <div className="skills-tags">
        {skills.map(({ label, group }) => (
          <span key={label} className={`skill-tag skill-${group}`}>
            {label}
          </span>
        ))}
      </div>
      <p className="about-block-hint">不在产品职责范围内，但真实做过的尝试。</p>
      <div className="side-projects">
        {sideProjects.map(({ title, desc }) => (
          <div key={title} className="side-project-item">
            <h4>{title}</h4>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentPanel() {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>Human × Agent</em>
      </p>
      <h2>我与 Agent 的分工</h2>
      <p className="scene-text">
        <Words text={`让 Agent 做检索、方案探索、代码与重复整理。我负责问题定义、关键取舍与结果验收。遇到跨产品混用、规则漂移或"技术通过但体验不对"，就把失败写成下一轮可执行的约束。`} />
      </p>
      <a className="text-link" href={asset("case-notes.md")} target="_blank" rel="noreferrer">
        阅读案例与复盘说明 <ArrowUpRight size={17} />
      </a>
    </div>
  );
}

function ContactPanel({ goTo }) {
  return (
    <div className="scene-copy">
      <p className="scene-kicker">
        <em>Clarity is a craft.</em>
      </p>
      <h2>
        下一份作品，
        <br />
        继续从好问题开始。
      </h2>
      <p className="scene-text">
        <Words text="产品经理 / 产品实习 / 产品设计" />
      </p>
      <div className="hero-actions">
        <a className="button primary" href={resume} target="_blank" rel="noreferrer">
          查看我的简历 <ArrowUpRight size={18} />
        </a>
        <a className="text-link" href={`${import.meta.env.BASE_URL}resume.pdf`} download>
          下载 PDF <Download size={16} />
        </a>
      </div>
      <div className="contact-links">
        <a href="https://github.com/Mark-maker006" target="_blank" rel="noreferrer">
          <GitBranch size={16} /> GitHub <ArrowUpRight size={14} />
        </a>
        <button type="button" onClick={() => goTo(N)}>
          回到开头 <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Panel({ scene, goTo, onOpen, reduced }) {
  switch (scene.type) {
    case "hero":
      return <HeroPanel goTo={goTo} />;
    case "bundle":
      return <BundlePanel />;
    case "overview":
      return <OverviewPanel />;
    case "project":
      return <ProjectPanel project={projects[scene.project]} onOpen={onOpen} reduced={reduced} />;
    case "about":
      return [<ExperiencePanel key="e" />, <MethodsPanel key="m" />, <ToolsPanel key="t" />, <AgentPanel key="a" />][
        scene.about
      ];
    default:
      return <ContactPanel goTo={goTo} />;
  }
}

export default function Scenes({ reduced, inert, initialProjectId, onOpenProject }) {
  const anchorsRef = useRef([]);
  const panelsRef = useRef([]);
  const progressRef = useRef(0);
  const didInit = useRef(false);
  const [active, setActive] = useState(0);
  const location = useLocation();

  // 场景 i 的起点在轨道上的第 i + 1 段；i 为 N 时是“重新萌发”，到了就绕回开头
  const goTo = useCallback(
    (index) => {
      anchorsRef.current[index + 1]?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
    },
    [reduced],
  );
  const selectNode = useCallback(
    (i) => goTo(SCENES.findIndex((s) => s.type === "project" && s.project === i)),
    [goTo],
  );

  // 进入首页时停在开头（不是轨道最上面那段副本）；直接打开某个项目的链接时，背后停在该项目的场景
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-scenes");
    if (!didInit.current) {
      didInit.current = true;
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      const i = Math.max(SCENES.findIndex((s) => s.key === initialProjectId), 0);
      anchorsRef.current[i + 1]?.scrollIntoView({ behavior: "instant" });
    }
    return () => root.classList.remove("has-scenes");
  }, [initialProjectId]);

  // 连续滚动：滚动位置线性映射成进度，进度再带阻尼地追随（类似 Lenis 的手感）；
  // 3D 形态、镜头和文字都按这个小数进度实时插值，停在半路就是半路的样子。
  // 停手约 300ms 后平滑吸附；手指还按着、浮层打开时不吸附。
  useEffect(() => {
    // settled：上一次停稳的那一幕，吸附方向以它为参照
    const st = { raw: 0, smooth: null, touching: false, settled: 0 };
    const shown = SCENES.map(() => null);
    let top0 = 0;
    let L = 1;
    let snapTimer = 0;
    let frame = 0;
    let last = performance.now();
    let current = -1;

    const measure = () => {
      const a = anchorsRef.current;
      top0 = a[0].offsetTop;
      L = Math.max(a[1].offsetTop - top0, 1);
    };
    const frozen = () => document.documentElement.classList.contains("overlay-open");
    // 有方向的吸附：离开停稳的那一幕超过一小段（SNAP_NUDGE），就顺着滚动方向落到下一幕，
    // 否则弹回原处。这样触控板轻扫、手机短滑也能翻页，不会被“就近吸附”拉回来
    const snap = () => {
      if (st.touching || frozen()) return;
      const delta = st.raw - st.settled;
      const target =
        Math.abs(delta) < SNAP_NUDGE
          ? st.settled
          : delta > 0
            ? Math.ceil(st.raw - SNAP_NUDGE)
            : Math.floor(st.raw + SNAP_NUDGE);
      // 吸附一开始就把目标记为停稳的一幕：动画途中用户再滚，也以它为参照
      st.settled = target;
      if (Math.abs(target - st.raw) < 0.002) return;
      window.scrollTo({ top: top0 + (target + 1) * L, behavior: reduced ? "instant" : "smooth" });
    };
    const armSnap = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snap, reduced ? 100 : SNAP_DELAY);
    };
    const onScroll = () => {
      let raw = (window.scrollY - top0) / L - 1;
      // 越过两端：平移一整圈，阻尼中的进度同步平移，画面不跳
      const shift = raw >= N - 0.01 ? -N : raw <= -0.99 ? N : 0;
      if (shift) {
        window.scrollTo({ top: window.scrollY + shift * L, behavior: "instant" });
        raw += shift;
        st.settled += shift;
        if (st.smooth !== null) st.smooth += shift;
      }
      st.raw = raw;
      armSnap();
    };
    const onTouchStart = () => {
      st.touching = true;
    };
    const onTouchEnd = () => {
      st.touching = false;
      armSnap();
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    // 每一幕的文字只在自己那一段进度里出现：离整数位置越远越淡、越往上漂，
    // 足够清楚时才可点击和聚焦
    const paint = (p) => {
      let best = 0;
      SCENES.forEach((_, i) => {
        const d = circ(p - i);
        if (Math.abs(d) < Math.abs(circ(p - best))) best = i;
        const el = panelsRef.current[i];
        if (!el) return;
        const v = 1 - smoothstep(0.1, 0.42, Math.abs(d));
        const state = v < 0.01 ? "hidden" : v > 0.6 ? "on" : "fade";
        // 看不见的幕不写样式：--d、--lit 会被里面每个词继承，逐帧改写会让整棵子树重算样式
        if (state !== "hidden" || shown[i] !== "hidden") {
          el.style.opacity = v.toFixed(3);
          el.style.setProperty("--d", d.toFixed(3));
          // 离本幕越近，点亮的词越多；停稳时全部点亮
          el.style.setProperty("--lit", (1.25 - Math.abs(d) * 4.2).toFixed(2));
        }
        if (shown[i] === state) return;
        shown[i] = state;
        el.style.visibility = state === "hidden" ? "hidden" : "visible";
        el.inert = state !== "on";
        el.classList.toggle("is-active", state === "on");
        // 每次进入这一幕，标题用乱码解码出场一次
        if (state === "on" && !reduced) scramble(el.querySelector("h1, h2"));
      });
      if (best !== current) {
        current = best;
        setActive(best);
      }
    };

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (st.smooth === null || reduced) st.smooth = st.raw;
      else st.smooth += (st.raw - st.smooth) * (1 - Math.exp(-dt * 7));
      if (Math.abs(st.raw - st.smooth) < 0.0005) st.smooth = st.raw;
      // 减少动态：不做阻尼和半路形态，直接按最近的一幕显示
      const p = reduced ? Math.round(st.raw) : st.smooth;
      progressRef.current = p;
      paint(p);
      frame = requestAnimationFrame(tick);
    };

    measure();
    onScroll();
    st.smooth = st.raw;
    st.settled = Math.round(st.raw);
    clearTimeout(snapTimer);
    frame = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", armSnap, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(snapTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", armSnap);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  // 从详情卡片里点导航时，回到首页后跳到对应场景
  useEffect(() => {
    const target = location.state?.scrollTo;
    if (!target) return;
    const i = SCENES.findIndex((s) => s.anchor === target);
    if (i >= 0) anchorsRef.current[i + 1]?.scrollIntoView({ behavior: "instant" });
  }, [location.state]);

  return (
    <>
      <main className="stage" inert={inert}>
        <Suspense fallback={null}>
          <MultiverseScene
            projects={projects}
            scenes={LOOP_SCENES}
            progressRef={progressRef}
            reduced={reduced}
            onSelect={selectNode}
          />
        </Suspense>
        {SCENES.map((scene, i) => (
          <section
            key={scene.key}
            ref={(el) => (panelsRef.current[i] = el)}
            className={`scene-panel scene-${scene.type} ${placementOf(scene)}`}
            aria-label={scene.label}
            style={{ opacity: 0, visibility: "hidden" }}
            inert
          >
            <Panel scene={scene} goTo={goTo} onOpen={onOpenProject} reduced={reduced} />
          </section>
        ))}
        <nav className="scene-dots" aria-label="场景导航">
          {SCENES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={i === active ? "is-active" : ""}
              aria-current={i === active ? "step" : undefined}
              aria-label={`跳到：${s.label}`}
              onClick={() => goTo(i)}
              style={s.type === "project" ? { "--strand": projects[s.project].color } : undefined}
            >
              <span>{s.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="scene-loop"
            aria-label="回到起点"
            // 后半程顺着环往前绕回开头，前半程直接回到开头
            onClick={() => goTo(active >= N / 2 ? N : 0)}
          >
            <RotateCw size={12} />
          </button>
        </nav>
        {active === 0 && !reduced && (
          <p className="scroll-cue" aria-hidden="true">
            <em>Scroll</em> <ArrowDown size={14} />
          </p>
        )}
      </main>
      <div className="scene-track" aria-hidden="true">
        {TRACK.map((key, a) => (
          <div
            key={key}
            id={a >= 1 && a <= N ? SCENES[a - 1].anchor : undefined}
            ref={(el) => (anchorsRef.current[a] = el)}
            className="scene-anchor"
          />
        ))}
      </div>
    </>
  );
}
