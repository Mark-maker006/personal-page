import * as THREE from "three";
import { SEED, SEPARATE_Y, strandPaths } from "./strands";

// 粒子形态表：每一幕、每条脉络各是一条路径，重采样成固定点数后塞进一张浮点纹理。
// 运行时粒子只沿路径流动、在相邻两幕的路径之间插值，不做任何实时几何计算。
export const SAMPLES = 1024;
export const BUNDLE_CENTER = new THREE.Vector3(0, -1.9, 0);
export const OVERVIEW_CENTER = new THREE.Vector3(0, 1.8, 0);
export const ABOUT_CENTER = new THREE.Vector3(0, 0.8, 0);
export const CONTACT_CENTER = new THREE.Vector3(0, 0.6, 0);
const TAU = Math.PI * 2;
const ABOUT_TINT = 0.7;

// 路径构造器：点的 w >= 0 表示可见（w 同时是“交汇白 → 项目色”的混合量），w < 0 是隐藏的跳转段；
// wt 是该段在时长上的权重，低权重的段粒子走得快、分到的粒子少。
function makePath() {
  const pts = [];
  return {
    pts,
    add(x, y, z, w = 1, wt = 1) {
      pts.push([x, y, z, w, wt]);
    },
    jump(x, y, z) {
      const last = pts[pts.length - 1];
      if (last) pts.push([last[0], last[1], last[2], -1, 1]);
      pts.push([x, y, z, -1, 1]);
    },
  };
}

// 按“加权弧长”重采样：隐藏段几乎不占时长，粒子集中在可见部分
function resample(pts, out, offset) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const wt = a[3] < 0 || b[3] < 0 ? 0.02 : Math.min(a[4], b[4]);
    cum.push(cum[k - 1] + len * wt + 1e-6);
  }
  const total = cum[cum.length - 1];
  let k = 1;
  for (let i = 0; i < SAMPLES; i++) {
    const target = (i / (SAMPLES - 1)) * total;
    while (k < cum.length - 1 && cum[k] < target) k++;
    const a = pts[k - 1];
    const b = pts[k];
    const t = Math.min(Math.max((target - cum[k - 1]) / (cum[k] - cum[k - 1]), 0), 1);
    const o = offset + i * 4;
    out[o] = a[0] + (b[0] - a[0]) * t;
    out[o + 1] = a[1] + (b[1] - a[1]) * t;
    out[o + 2] = a[2] + (b[2] - a[2]) * t;
    out[o + 3] = a[3] < 0 || b[3] < 0 ? -1 : a[3] + (b[3] - a[3]) * t;
  }
}

const smoothstep = (a, b, v) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// ---------- 叙事形态 ----------

// 开始：所有粒子收在种子里，绕着一个光球的经线来回流动
function seed(p, i) {
  const n = 700;
  const tilt = i * 0.45;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const phi = Math.PI * (t < 0.5 ? 2 * t : 2 - 2 * t);
    const lon = t * TAU * 9 + (i * TAU) / 4;
    const r = 1.05;
    const x = r * Math.sin(phi) * Math.cos(lon);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(lon);
    p.add(
      SEED[0] + x * Math.cos(tilt) - y * Math.sin(tilt),
      SEED[1] + x * Math.sin(tilt) + y * Math.cos(tilt),
      SEED[2] + z,
      0,
    );
  }
}

// 交织：四束光丝在低处松散地拧成一股
function braid(p, i) {
  const n = 400;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = t * TAU * 3.2 + (i * TAU) / 4;
    const r = 0.36 + 0.16 * Math.sin(t * TAU * 2 + i);
    p.add(r * Math.cos(a) + 0.25 * Math.sin(t * 4), -5 + t * 6.4, r * Math.sin(a), smoothstep(0.8, 1, t) * 0.6);
  }
}

// 固定种子的伪随机：每次重建形态表（比如跨过窄屏阈值）都得到同样的枝杈
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 闪电 / 神经元式的细枝：沿 dir 抖动前进，末端再分叉出更细的子枝
function twig(p, origin, dir, len, depth, rand, w = 1, sx = 1) {
  const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const at = origin.clone();
  p.jump(at.x * sx, at.y, at.z);
  const steps = 10;
  for (let k = 1; k <= steps; k++) {
    at.addScaledVector(dir, len / steps);
    const j = (rand() - 0.5) * 0.16 * len;
    p.add((at.x + side.x * j) * sx, at.y + side.y * j, at.z + (rand() - 0.5) * 0.1 * len, w, 0.8);
  }
  if (depth <= 0) return;
  for (const turn of [-0.55, 0.5]) {
    const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), turn + (rand() - 0.5) * 0.3);
    twig(p, at, d, len * 0.58, depth - 1, rand, w, sx);
  }
}

// 四个宇宙：从种子出发、交汇后分离的四条分支（就是 strands.js 的手调曲线）。
// 主分支分离之后再“抽”出两根细枝，像时间线上又发生了更小的分叉
function branch(p, curve, separate, sx, wt = 1, seedNo = 1) {
  const n = 320;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const v = curve.getPointAt(t);
    p.add(v.x * sx, v.y, v.z, smoothstep(separate - 0.04, separate + 0.1, t), wt);
  }
  if (wt < 1) return;
  const rand = rng(seedNo * 97);
  [separate + 0.18, separate + 0.38].forEach((t, k) => {
    const o = curve.getPointAt(Math.min(t, 0.95));
    const tan = curve.getTangentAt(Math.min(t, 0.95));
    const d = tan.applyAxisAngle(new THREE.Vector3(0, 0, 1), k % 2 ? 0.7 : -0.7).normalize();
    twig(p, o, d, 1.1 - k * 0.25, 1, rand, 1, sx);
  });
}

// 阅读：书页般层叠的波浪
function pages(p, c, s) {
  const rows = 6;
  for (let j = 0; j < rows; j++) {
    const dir = j % 2 ? -1 : 1;
    for (let k = 0; k <= 80; k++) {
      const x = dir * (-2.2 + (4.4 * k) / 80);
      const y = (j - (rows - 1) / 2) * 0.48 + 0.2 * Math.sin(x * 1.8 + j * 0.9);
      const z = -j * 0.28 + 0.3 * Math.cos(x * 1.1);
      p.add(c.x + x * s, c.y + y * s, c.z + z * s);
    }
  }
}

// 拼读：5×7 点阵拼出 CAT，每个点是一圈很小的环
const GLYPHS = {
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
};
function letters(p, c, s) {
  const gap = 0.3;
  const word = "CAT";
  const cols = word.length * 6 - 1;
  word.split("").forEach((ch, li) => {
    GLYPHS[ch].forEach((row, ry) => {
      row.split("").forEach((cell, rx) => {
        if (cell !== "#") return;
        const x = c.x + ((li * 6 + rx - (cols - 1) / 2) * gap) * s;
        const y = c.y + ((3 - ry) * gap) * s;
        p.jump(x + 0.07 * s, y, c.z);
        for (let k = 0; k <= 16; k++) {
          const a = (k / 16) * TAU * 2;
          p.add(x + 0.07 * s * Math.cos(a), y + 0.07 * s * Math.sin(a), c.z);
        }
      });
    });
  });
}

// 竞品研究：节点与连线构成的网络图
const GRAPH_NODES = [
  [-2, 1.2, 0.3], [-0.6, 1.6, -0.4], [1, 1.3, 0.2], [2.1, 0.4, -0.3], [-1.6, -0.2, -0.5],
  [0, 0.1, 0.5], [1.4, -0.8, 0], [-0.7, -1.3, 0.2], [0.6, -1.6, -0.4],
];
const GRAPH_EDGES = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [5, 6], [3, 6],
  [4, 5], [4, 7], [7, 5], [7, 8], [8, 6], [1, 4], [2, 6],
];
function graph(p, c, s) {
  const at = (n) => [c.x + GRAPH_NODES[n][0] * s, c.y + GRAPH_NODES[n][1] * s, c.z + GRAPH_NODES[n][2] * s];
  GRAPH_EDGES.forEach(([a, b]) => {
    const A = at(a);
    const B = at(b);
    p.jump(...A);
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      p.add(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    }
  });
  GRAPH_NODES.forEach((_, n) => {
    const [x, y, z] = at(n);
    p.jump(x + 0.14 * s, y, z);
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * TAU * 2;
      p.add(x + 0.14 * s * Math.cos(a), y + 0.14 * s * Math.sin(a), z, 1, 2);
    }
  });
}

// Agent：环形流水线，五个工位处线圈鼓起
function pipeline(p, c, s) {
  const n = 1400;
  const R = 1.9;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * TAU;
    let bulge = 0;
    for (let st = 0; st < 5; st++) {
      const d = Math.atan2(Math.sin(a - (st * TAU) / 5 - Math.PI / 2), Math.cos(a - (st * TAU) / 5 - Math.PI / 2));
      bulge += Math.exp(-(d * d) / 0.02);
    }
    const rr = 0.14 + 0.32 * bulge;
    const coil = a * 42;
    const ring = R + rr * Math.cos(coil);
    p.add(c.x + ring * Math.cos(a) * s, c.y + ring * Math.sin(a) * s, c.z + rr * Math.sin(coil) * s);
  }
}

const SIGNATURES = { reading: pages, phonics: letters, research: graph, agent: pipeline };

// 经历：一条时间轴，每条脉络在自己的里程碑处隆起
function timeline(p, i, sx) {
  const W = 4.2 * sx;
  const mx = -W + ((i + 0.5) * 2 * W) / 4;
  for (let k = 0; k <= 500; k++) {
    const x = -W + (2 * W * k) / 500;
    const bump = Math.exp(-(((x - mx) / 0.16) ** 2)) * 0.9;
    const y = ABOUT_CENTER.y + (i - 1.5) * 0.14 + 0.06 * Math.sin(x * 1.7 + i * 1.3) + bump;
    p.add(x, y, (i - 1.5) * 0.2, ABOUT_TINT);
  }
}

// 方法：四层倾斜的同心环
function rings(p, i, sx) {
  const R = 0.9 + i * 0.55;
  const y0 = ABOUT_CENTER.y + (1.5 - i) * 0.38;
  for (let k = 0; k <= 360; k++) {
    const a = (k / 360) * TAU;
    const x = R * Math.cos(a);
    const z = R * Math.sin(a);
    p.add(x * sx, y0 + z * Math.sin(0.42), z * Math.cos(0.42), ABOUT_TINT);
  }
}

// 工具：四层前后错开的网格
function grid(p, i, sx) {
  const half = 1.7;
  const lines = 5;
  const z = (i - 1.5) * 0.9;
  const cy = ABOUT_CENTER.y;
  for (let r = 0; r < lines; r++) {
    const y = cy - half + (2 * half * r) / (lines - 1);
    const dir = r % 2 ? -1 : 1;
    for (let k = 0; k <= 40; k++) p.add(dir * (-half + (2 * half * k) / 40) * sx, y, z, ABOUT_TINT);
  }
  for (let col = 0; col < lines; col++) {
    const x = -half + (2 * half * col) / (lines - 1);
    const dir = col % 2 ? 1 : -1;
    p.jump(x * sx, cy - dir * half, z);
    for (let k = 0; k <= 40; k++) p.add(x * sx, cy + dir * (-half + (2 * half * k) / 40), z, ABOUT_TINT);
  }
}

// 与 Agent 协作：两股双螺旋
function helix(p, i, sx) {
  const phase = (i < 2 ? 0 : Math.PI) + (i % 2) * 0.28;
  for (let k = 0; k <= 400; k++) {
    const t = k / 400;
    const a = t * TAU * 2.5 + phase;
    p.add(1.1 * Math.cos(a) * sx, ABOUT_CENTER.y - 3 + t * 6, 1.1 * Math.sin(a), ABOUT_TINT);
  }
}

// 联系：所有时间线从同一根主干向上长成一棵“世界之树”，下一幕再整体坍缩回种子
function tree(p, i, sx) {
  const c = CONTACT_CENTER;
  const rand = rng(500 + i * 31);
  // 主干：四股光丝在下方缠绕成一根
  for (let k = 0; k <= 200; k++) {
    const t = k / 200;
    const a = t * TAU * 2.2 + (i * TAU) / 4;
    p.add(c.x + 0.24 * Math.cos(a) * sx, c.y - 3.4 + t * 3.2, c.z + 0.24 * Math.sin(a), 0);
  }
  // 主枝：从主干顶端各自向外上方弯出
  const spread = (i - 1.5) * 1.15;
  const limb = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(c.x, c.y - 0.2, c.z),
    new THREE.Vector3(c.x + spread * 0.5, c.y + 1.2, c.z + (i % 2 ? 0.3 : -0.3)),
    new THREE.Vector3(c.x + spread * 2.1, c.y + 2.9 - Math.abs(spread) * 0.35, c.z + (i % 2 ? 0.5 : -0.5)),
  );
  for (let k = 0; k <= 160; k++) {
    const t = k / 160;
    const v = limb.getPoint(t);
    p.add(v.x * sx, v.y, v.z, smoothstep(0, 0.4, t));
  }
  // 枝杈与根须
  [0.4, 0.68, 0.95].forEach((t, k) => {
    const o = limb.getPoint(t);
    const d = limb.getTangent(t).applyAxisAngle(new THREE.Vector3(0, 0, 1), (k % 2 ? 0.6 : -0.6) * Math.sign(spread || 1));
    twig(p, o, d, 1.1 - k * 0.2, 2, rand, 1, sx);
  });
  const root = new THREE.Vector3(c.x, c.y - 3.3, c.z);
  twig(p, root, new THREE.Vector3(spread * 0.35, -1, 0).normalize(), 0.8, 1, rand, 0, sx);
}

const ABOUT_SHAPES = [timeline, rings, grid, helix];

// 生成全部形态。sx 是窄屏时的横向压缩比例，sig 是签名形态的整体缩放
export function buildShapes(projects, scenes, sx, sig) {
  const branches = projects.map((project) => {
    const curve = new THREE.CatmullRomCurve3(strandPaths[project.id].points.map((v) => new THREE.Vector3(...v)));
    let separate = 0.6;
    for (let t = 0; t <= 1; t += 0.005) {
      if (curve.getPointAt(t).y >= SEPARATE_Y) {
        separate = t;
        break;
      }
    }
    const end = curve.getPointAt(1);
    const fork = curve.getPointAt(separate + 0.04);
    return {
      curve,
      separate,
      node: new THREE.Vector3(end.x * sx, end.y, end.z),
      fork: new THREE.Vector3(fork.x * sx, fork.y, fork.z),
    };
  });

  const data = new Float32Array(SAMPLES * 4 * scenes.length * 4);
  scenes.forEach((sc, si) => {
    projects.forEach((project, i) => {
      const p = makePath();
      const b = branches[i];
      switch (sc.type) {
        case "hero":
          seed(p, i);
          break;
        case "bundle":
          braid(p, i);
          break;
        case "project":
          if (sc.project === i) {
            // 先沿自己的分支（低权重，少量粒子）长上来，再展开成签名形态
            branch(p, b.curve, b.separate, sx, 0.18, i + 1);
            SIGNATURES[project.id](p, b.node, sig);
          } else {
            branch(p, b.curve, b.separate, sx, 1, i + 1);
          }
          break;
        case "about":
          ABOUT_SHAPES[sc.about](p, i, sx);
          break;
        case "contact":
          tree(p, i, sx);
          break;
        default:
          branch(p, b.curve, b.separate, sx, 1, i + 1);
      }
      resample(p.pts, data, (si * 4 + i) * SAMPLES * 4);
    });
  });
  return { data, nodes: branches.map((b) => b.node), forks: branches.map((b) => b.fork) };
}
