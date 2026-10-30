import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

// 每个项目场景里一个十秒内能玩完的小交互，内容都来自项目本身的材料。
// 需要和背景光丝联动时，发一个 multiverse:pulse 事件，让该项目的那条光丝跑一道亮脉冲。
const pulse = (strand, duration = 2.4) =>
  window.dispatchEvent(new CustomEvent("multiverse:pulse", { detail: { strand, duration } }));

const lerp = (a, b, t) => a + (b - a) * t;

// ---------- 悦读小达人：上线前后 28 天的观察数据（public/assets/cases/yuedu-metrics.json） ----------
const RETENTION = [
  ["次日", 0.455, 0.469],
  ["7 日", 0.207, 0.227],
  ["14 日", 0.156, 0.171],
  ["30 日", 0.113, 0.123],
];
const DAU = [13079, 16135];

function ReadingPlay() {
  const [t, setT] = useState(0);
  const W = 240;
  const H = 92;
  const x = (i) => 14 + (i * (W - 28)) / (RETENTION.length - 1);
  const y = (v) => H - 14 - (v / 0.5) * (H - 26);
  const line = (k) => RETENTION.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(lerp(r[1], r[2], k)).toFixed(1)}`).join(" ");
  return (
    <div className="play play-reading">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path d={line(0)} className="play-ghost" />
        <path d={line(t)} className="play-line" />
        {RETENTION.map((r, i) => (
          <g key={r[0]}>
            <circle cx={x(i)} cy={y(lerp(r[1], r[2], t))} r="3" className="play-dot" />
            <text x={x(i)} y={H - 2} textAnchor="middle">
              {r[0]}
            </text>
          </g>
        ))}
      </svg>
      <div className="play-readout">
        <span>{t < 0.5 ? "上线前 28 天" : "上线后 28 天"}</span>
        <strong>
          日活 {Math.round(lerp(DAU[0], DAU[1], t)).toLocaleString("zh-CN")} · 次日留存{" "}
          {(lerp(RETENTION[0][1], RETENTION[0][2], t) * 100).toFixed(1)}%
        </strong>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(t * 100)}
        aria-label="在游戏化上线前与上线后之间拖动"
        onChange={(e) => setT(e.target.value / 100)}
      />
      <p className="play-note">双端合计的前后观察，不是 A/B 实验，不能直接归因。</p>
    </div>
  );
}

// ---------- 单词拼读王：碰一下散开的字母，拼回 cat ----------
const LETTERS = [
  ["c", "/k/", -64, 26, -14],
  ["a", "/æ/", 52, -22, 10],
  ["t", "/t/", -10, 34, 18],
];

function PhonicsPlay() {
  const [placed, setPlaced] = useState([]);
  const done = placed.length === LETTERS.length;
  const place = (i) => {
    if (placed.includes(i)) return;
    const next = [...placed, i];
    setPlaced(next);
    if (next.length === LETTERS.length) pulse(1, 2);
  };
  return (
    <div className={`play play-phonics ${done ? "is-done" : ""}`}>
      <div className="phonics-slots">
        {LETTERS.map(([ch, sound, dx, dy, rot], i) => {
          const on = placed.includes(i);
          return (
            <button
              key={ch}
              type="button"
              className={`phonics-tile ${on ? "is-placed" : ""}`}
              style={on ? undefined : { translate: `${dx}px ${dy}px`, rotate: `${rot}deg` }}
              aria-label={on ? `${ch}，读作 ${sound}` : `拼入字母 ${ch}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && place(i)}
              onClick={() => place(i)}
            >
              <span>{ch}</span>
              <small>{on ? sound : ""}</small>
            </button>
          );
        })}
      </div>
      <div className="play-readout" aria-live="polite">
        {done ? (
          <>
            <strong>/k/ · /æ/ · /t/ → cat</strong>
            <button type="button" className="play-reset" onClick={() => setPlaced([])}>
              <RotateCcw size={13} /> 再拼一次
            </button>
          </>
        ) : (
          <span>碰一下字母，把它拼回单词（{placed.length}/3）</span>
        )}
      </div>
      <p className="play-note">拆 → 拼，是六步学习里的两步；拼对时宠物给出完整庆祝。</p>
    </div>
  );
}

// ---------- 竞品研究：碰一个产品，看和它同一类型的竞品连成一组 ----------
const COMPETITORS = [
  ["Epic", "内容库型", "书库 + 个性化推荐"],
  ["Vooks", "动画互动型", "绘本动画 + 旁白"],
  ["Novel Effect", "共读增强型", "语音识别 + 音效"],
  ["Raz-Kids", "分级课程型", "分级课程 + 测评"],
  ["Reading Eggs", "分级课程型", "课程 + 游戏化任务"],
  ["Khan Academy Kids", "综合启蒙型", "综合课程 + 角色引导"],
  ["StoryWeaver", "内容库型", "开放内容 + 社区翻译"],
  ["伴鱼绘本", "分级课程型", "分级 + 跟读激励"],
  ["叫叫", "综合启蒙型", "课程包 + 任务体系"],
  ["洪恩双语绘本", "动画互动型", "动画 + 双语跟读"],
  ["呱呱阅读", "共读增强型", "共读 + 社群任务"],
  ["KaDa 阅读", "内容库型", "内容订阅 + 亲子任务"],
];

function ResearchPlay() {
  const [focus, setFocus] = useState(null);
  const W = 240;
  const H = 120;
  const pos = useMemo(
    () =>
      COMPETITORS.map((_, i) => {
        const a = (i / COMPETITORS.length) * Math.PI * 2 - Math.PI / 2;
        return [W / 2 + Math.cos(a) * 100, H / 2 + Math.sin(a) * 48];
      }),
    [],
  );
  const type = focus === null ? null : COMPETITORS[focus][1];
  const group = COMPETITORS.map((c, i) => (c[1] === type ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="play play-research">
      <div className="research-map">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {group.flatMap((a, k) =>
            group.slice(k + 1).map((b) => (
              <line key={`${a}-${b}`} x1={pos[a][0]} y1={pos[a][1]} x2={pos[b][0]} y2={pos[b][1]} />
            )),
          )}
        </svg>
        {COMPETITORS.map(([name, t], i) => (
          <button
            key={name}
            type="button"
            className={`research-node ${type === t ? "is-lit" : ""} ${focus === i ? "is-focus" : ""}`}
            style={{ left: `${(pos[i][0] / W) * 100}%`, top: `${(pos[i][1] / H) * 100}%` }}
            aria-label={`${name}：${t}`}
            onPointerEnter={() => setFocus(i)}
            onFocus={() => setFocus(i)}
            onClick={() => setFocus(i)}
          />
        ))}
      </div>
      <div className="play-readout" aria-live="polite">
        {focus === null ? (
          <span>碰一个点，看哪些产品走的是同一条路</span>
        ) : (
          <>
            <strong>
              {COMPETITORS[focus][0]} · {type}
            </strong>
            <span>
              同类 {group.length} 个 · {COMPETITORS[focus][2]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Agent 工作流：跑一遍流程，中途超时也能从任务 ID 接着走 ----------
const STEPS = ["提交任务", "记下任务 ID", "超时，按 ID 续查", "检查真实 alpha", "动作节奏验收"];

function AgentPlay({ reduced }) {
  const [step, setStep] = useState(-1);
  const timer = useRef(0);
  useEffect(() => () => clearInterval(timer.current), []);
  const run = () => {
    clearInterval(timer.current);
    pulse(3, reduced ? 0.01 : 2.6);
    if (reduced) {
      setStep(STEPS.length);
      return;
    }
    setStep(0);
    let k = 0;
    timer.current = setInterval(() => {
      k += 1;
      setStep(k);
      if (k >= STEPS.length) clearInterval(timer.current);
    }, 520);
  };
  return (
    <div className="play play-agent">
      <ol className="agent-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`${step > i ? "is-done" : ""} ${step === i ? "is-now" : ""} ${i === 2 ? "is-recover" : ""}`}>
            {s}
          </li>
        ))}
      </ol>
      <div className="play-readout" aria-live="polite">
        <button type="button" className="play-reset" onClick={run}>
          <Play size={13} /> {step < 0 ? "跑一遍流程" : "再跑一遍"}
        </button>
        <span>{step >= STEPS.length ? "通过：中断后不用整条重跑" : step >= 0 ? STEPS[step] : "长任务会超时，但不必从头再来"}</span>
      </div>
    </div>
  );
}

export function ProjectPlay({ project, reduced }) {
  switch (project.id) {
    case "reading":
      return <ReadingPlay />;
    case "phonics":
      return <PhonicsPlay />;
    case "research":
      return <ResearchPlay />;
    default:
      return <AgentPlay reduced={reduced} />;
  }
}

// ---------- 文字入场 ----------

// 逐词点亮：每个词带一个 0–1 的序号，亮度由所在场景的 --lit 决定（随滚动进度变化）
export function Words({ text }) {
  const words = useMemo(() => {
    try {
      const seg = new Intl.Segmenter("zh", { granularity: "word" });
      return [...seg.segment(text)].map((s) => s.segment);
    } catch {
      return [...text];
    }
  }, [text]);
  return words.map((w, i) => (
    <span key={i} className="word" style={{ "--i": (i / words.length).toFixed(3) }}>
      {w}
    </span>
  ));
}

// 标题乱码解码：只改文本节点的内容、不改 DOM 结构，结束时原样还原
const GLYPHS = "▓▒░█▚▞◢◣◤◥/\\_#<>01";
export function scramble(el, duration = 720) {
  if (!el || el.dataset.decoding) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push([walker.currentNode, walker.currentNode.nodeValue]);
  const total = nodes.reduce((n, [, v]) => n + v.length, 0);
  if (!total) return;
  el.dataset.decoding = "1";
  el.setAttribute("aria-label", nodes.map(([, v]) => v).join(""));
  el.classList.add("is-decoding");
  const start = performance.now();
  let lastSwap = 0;
  const frame = (now) => {
    const t = Math.min((now - start) / duration, 1);
    if (now - lastSwap > 45 || t === 1) {
      lastSwap = now;
      const resolved = Math.floor(t * total);
      let k = 0;
      nodes.forEach(([node, orig]) => {
        let out = "";
        for (const ch of orig) {
          out += k < resolved || /\s/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          k += 1;
        }
        node.nodeValue = out;
      });
    }
    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }
    nodes.forEach(([node, orig]) => (node.nodeValue = orig));
    el.classList.remove("is-decoding");
    el.removeAttribute("aria-label");
    delete el.dataset.decoding;
  };
  requestAnimationFrame(frame);
}
