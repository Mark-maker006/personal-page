import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { ArrowUpRight, Moon, Sun, Menu, X, Check, Download } from "lucide-react";
import { asset, projects } from "./content";
import { usePageMotion, useReducedMotion } from "./motion";
import Scenes from "./Scenes";
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
const navLinks = [
  ["work", "精选作品"],
  ["about", "关于"],
  ["contact", "联系"],
];
// 跳到某个场景：锚点都在首页的滚动轨道上。详情卡片打开时（HashRouter 下 "#id"
// 会被当作路由路径）先关掉卡片回到首页，再由场景层跳到对应位置。
function ScrollLink({ id, className, children, onNavigated, ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();
  const handleClick = (e) => {
    e.preventDefault();
    onNavigated?.();
    if (location.pathname === "/") {
      // 首页的滚动轨道在开头前还有一段，所以“顶部”也按锚点定位，而不是滚到 0。
      // 稍等一下再滚：移动端菜单关闭后才解除滚动锁定，否则平滑滚动会被打断
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "instant" : "smooth" }), 60);
      return;
    }
    navigate("/", { state: { scrollTo: id } });
  };
  return (
    <a href={`#${id}`} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
function Header({ theme, toggleTheme, inert }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const node = navRef.current;
    const focusable = node.querySelectorAll("a, button");
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    first?.focus();
    const trap = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = "";
      node.removeEventListener("keydown", trap);
    };
  }, [open]);
  return (
    <header className="site-header" inert={inert}>
      <ScrollLink id="top" className="brand" aria-label="Mark 首页">
        MARK<span>.</span>
      </ScrollLink>
      <nav
        ref={navRef}
        aria-label="主导航"
        className={open ? "nav-open" : ""}
      >
        {navLinks.map(([id, label]) => (
          <ScrollLink key={id} id={id} onNavigated={() => setOpen(false)}>
            {label}
          </ScrollLink>
        ))}
        <a
          className="resume-link nav-resume-link"
          href={resume}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpen(false)}
        >
          简历 <ArrowUpRight size={15} />
        </a>
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
          className="resume-link desktop-resume-link"
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
// 项目详情：浮在首页之上的卡片。关闭后首页还停在原来的场景，可以继续往下滚。
function ProjectOverlay({ project, onClose, reduced }) {
  const [image, setImage] = useState(0);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const root = document.documentElement;
    const opener = document.activeElement;
    root.classList.add("overlay-open");
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("overlay-open");
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);
  const ease = [0.22, 1, 0.36, 1];
  return (
    <motion.div
      className="detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="detail-card"
        style={{ "--strand": project.color }}
        initial={reduced ? false : { opacity: 0, y: 70, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
        transition={{ duration: reduced ? 0 : 0.45, ease }}
      >
        <div className="dialog-inner">
          <div className="dialog-top">
            <span>{project.category}</span>
            <button
              ref={closeRef}
              type="button"
              className="icon-button"
              aria-label="关闭项目详情"
              onClick={onClose}
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
          {project.id === "reading" && <ImpactInline />}
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
          </div>
          <button type="button" className="button secondary back-to-work" onClick={onClose}>
            继续浏览
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
function ImpactInline() {
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
      document.getElementById(`metric-tab-inline-${next}`).focus();
    }
  };
  return (
    <div className="impact-inline" id="impact">
      <div className="impact-inline-header">
        <span className="context-label">游戏化上线前后 · Android + iOS / 全 APP / 各 28 天</span>
        <div className="data-takeaways-inline">
          {metrics.metrics.map((metric) => (
            <div key={metric.id}>
              <em>+{(metric.relativeChange * 100).toFixed(2)}%</em>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="metric-panel">
        <div role="tablist" aria-label="对比指标" className="metric-tabs">
          {metrics.metrics.map((metric, i) => (
            <button
              key={metric.id}
              id={`metric-tab-inline-${i}`}
              role="tab"
              aria-selected={selected === i}
              aria-controls="metric-content-inline"
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
          id="metric-content-inline"
          aria-labelledby={`metric-tab-inline-${selected}`}
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
      <p className="impact-inline-note">
        观察≠因果：无 A/B 测试，不能把变化直接归因于游戏化。
        <a href={asset("yuedu-metrics.json")} target="_blank" rel="noreferrer">
          查看原始口径 <ArrowUpRight size={13} />
        </a>
      </p>
    </div>
  );
}
export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const reduced = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const match = useMatch("/work/:id");
  const matchedId = match?.params.id;
  const project = projects.find((p) => p.id === matchedId) ?? null;
  // 直接打开某个项目的链接时，首页背景要停在该项目的场景
  const [initialProjectId] = useState(project?.id);
  usePageMotion(reduced);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* 禁用存储时本次访问仍可正常切换。 */
    }
  }, [theme]);
  useEffect(() => {
    if (matchedId && !project) navigate("/", { replace: true });
  }, [matchedId, project, navigate]);
  const openProject = useCallback(
    (id) => navigate(`/work/${id}`, { state: { overlay: true } }),
    [navigate],
  );
  const closeProject = useCallback(() => {
    // 从首页打开的就退回历史记录，直接访问链接打开的则替换成首页，避免退出网站
    if (location.state?.overlay) navigate(-1);
    else navigate("/", { replace: true });
  }, [location.state, navigate]);
  const overlayOpen = Boolean(project);
  return (
    <>
      <ScrollLink id="work" className="skip-link">
        跳到作品
      </ScrollLink>
      <div className="scroll-progress" />
      <Header
        theme={theme}
        toggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        inert={overlayOpen}
      />
      <Scenes
        reduced={reduced}
        inert={overlayOpen}
        initialProjectId={initialProjectId}
        onOpenProject={openProject}
      />
      <AnimatePresence>
        {project && (
          <ProjectOverlay
            key={project.id}
            project={project}
            onClose={closeProject}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </>
  );
}
