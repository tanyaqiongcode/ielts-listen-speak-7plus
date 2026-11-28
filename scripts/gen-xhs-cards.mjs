#!/usr/bin/env node
/**
 * 小红书图文物料生成器（听力口语 9 分训练营）。
 * HTML + CSS 排版 → Playwright 截图（720×960 @2x = 1440×1920 PNG）。
 * 自带验收：PNG 尺寸 / 内容溢出 / 二维码 jsQR 实扫解码。
 * 运行：npm run xhs
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import QRCode from "qrcode";
import jsQR from "jsqr";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "marketing", "xiaohongshu");
const SITE_URL = "https://tanyaqiongcode.github.io/ielts-listen-speak-7plus/";

const C = {
  bg: "#f7f4ee", card: "#fffdf9", line: "#ddd6c9",
  ink: "#1a1a1a", muted: "#63605a",
  accent: "#c22113", accentSoft: "#f9ece8", link: "#0b4f8a",
  ok: "#1d7a46", masthead: "#101418",
};

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 720px; height: 960px; overflow: hidden; }
body { background: ${C.bg}; color: ${C.ink};
  font-family: -apple-system, "PingFang SC", "Segoe UI", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased; }
.serif { font-family: "Songti SC", Georgia, "Times New Roman", serif; }
.page { height: 100%; padding: 52px 46px 44px; display: flex; flex-direction: column; }
.masthead { background: ${C.masthead}; margin: -52px -46px 0; padding: 20px 46px 16px; text-align: center; }
.masthead .brand { font-size: 24px; font-weight: 700; color: #fff; letter-spacing: .06em; }
.masthead .brand .red { color: #e0574e; }
.masthead .sub { margin-top: 4px; font-size: 10px; letter-spacing: .3em; color: #c7cdd4; }
.kicker { font-size: 11px; font-weight: 700; letter-spacing: .22em; color: ${C.accent}; }
h1 { font-family: "Songti SC", Georgia, serif; font-size: 34px; line-height: 1.3; }
h1 .red { color: ${C.accent}; }
.sub { margin-top: 10px; font-size: 13.5px; line-height: 1.65; color: ${C.muted}; }
.card { background: ${C.card}; border: 1px solid ${C.line}; border-top: 3px solid ${C.ink}; border-radius: 2px; }
.rule { border: none; border-top: 2px solid ${C.ink}; margin: 14px 0; }
.chip { display: inline-block; border: 1px solid ${C.line}; border-radius: 2px;
  padding: 5px 12px; font-size: 11.5px; color: ${C.ink}; background: ${C.card}; }
.chip-red { border-color: ${C.accent}; color: ${C.accent}; background: ${C.accentSoft}; font-weight: 600; }
.ftr { margin-top: auto; display: flex; justify-content: space-between;
  font-size: 10.5px; color: ${C.muted}; border-top: 1px solid ${C.line}; padding-top: 12px; }
`;

function chrome(inner, pageNo) {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="page">
  <div class="masthead">
    <div class="brand serif">听力口语 <span class="red">9</span> 分训练营</div>
    <div class="sub">IELTS LISTEN &amp; SPEAK LAB · EST. 2026</div>
  </div>
  <div style="height:18px;"></div>
  ${inner}
  <div class="ftr">
    <span>IELTS LISTEN &amp; SPEAK · 纯前端 · 数据不出本机</span>
    <span>${pageNo}</span>
  </div>
</div></body></html>`;
}

// ---------- P1 封面：三档阶梯 ----------
function tierStep(label, range, focus, height, filled) {
  const bg = filled ? C.accent : C.card;
  const color = filled ? "#FFFFFF" : C.ink;
  const border = `border:1px solid ${filled ? C.accent : C.line};`;
  return `
  <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;">
    <div style="background:${bg};${border}height:${height}px;padding:14px 14px 12px;border-radius:2px;">
      <p style="font-size:20px;font-weight:700;color:${color};font-family:'Songti SC',Georgia,serif;">${label}</p>
      <p style="font-size:11px;color:${color};opacity:.85;margin-top:2px;">${range}</p>
      <p style="font-size:10.5px;color:${color};opacity:.8;margin-top:6px;line-height:1.5;">${focus}</p>
    </div>
  </div>`;
}

const PAGE1 = `
  <div>
    <p class="kicker">IELTS LISTENING &amp; SPEAKING · TRAINING BULLETIN</p>
    <h1 style="margin-top:12px;">从雅思 <span class="red">5.5–6.5</span>，<br/>到听力口语 9 分（满分）</h1>
    <p class="sub">这不是一个背单词网站，而是一套直达满分的训练系统：<br/>精听四步法 + 影子跟读 + 逐句听写 + 分档路线图。</p>
  </div>
  <div style="margin-top:26px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:.18em;color:${C.muted};">分档路线 · 按短板定起点</p>
    <div style="display:flex;gap:12px;align-items:flex-end;margin-top:10px;">
      ${tierStep("5–7", "筑基 · 突破", "语音辨识 + 开口量", 120, false)}
      ${tierStep("7–8", "强化 · 精进", "精度 + 地道度", 170, false)}
      ${tierStep("8–9", "满分冲刺", "抗噪 + 毫不费力感", 220, true)}
    </div>
  </div>
  <div style="margin-top:24px;">
    <hr class="rule"/>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <span class="chip chip-red">🎯 3 分钟定位测试</span>
      <span class="chip">逐句听写工作台</span>
      <span class="chip">BBC / CNN 每日素材</span>
      <span class="chip">90 天路线图</span>
    </div>
    <p style="margin-top:14px;font-size:12px;line-height:1.7;color:${C.muted};">
      先用 3 分钟定位测试确认起点，再进对应分档逐档打满 9 分。定位测试仅作训练分组参考，不是标准化测评。</p>
  </div>
  <div style="margin-top:auto;padding-top:16px;">
    <hr class="rule"/>
    <p style="font-size:11px;font-weight:700;letter-spacing:.18em;color:${C.muted};">三步用法 · 每档周期 4–12 周</p>
    <div style="display:flex;gap:12px;margin-top:10px;">
      <div style="flex:1;background:${C.card};border:1px solid ${C.line};padding:12px 14px;border-radius:2px;">
        <p style="font-size:12.5px;font-weight:700;color:${C.accent};">① 定位</p>
        <p style="font-size:11px;line-height:1.55;color:${C.muted};margin-top:2px;">3 分钟测试或真题成绩确认起点档位</p>
      </div>
      <div style="flex:1;background:${C.card};border:1px solid ${C.line};padding:12px 14px;border-radius:2px;">
        <p style="font-size:12.5px;font-weight:700;color:${C.ink};">② 进档</p>
        <p style="font-size:11px;line-height:1.55;color:${C.muted};margin-top:2px;">按该档「每日排片 + 素材 + 工具箱」执行</p>
      </div>
      <div style="flex:1;background:${C.card};border:1px solid ${C.line};padding:12px 14px;border-radius:2px;">
        <p style="font-size:12.5px;font-weight:700;color:${C.ink};">③ 升档</p>
        <p style="font-size:11px;line-height:1.55;color:${C.muted};margin-top:2px;">达到毕业标准进下一档，未达标回常见坑排查</p>
      </div>
    </div>
  </div>`;

// ---------- P2 为什么卡在 5.5–6.5 ----------
function painBlock(icon, titleZh, items) {
  const rows = items.map((x) => `
    <li style="margin-top:10px;">
      <p style="font-size:13px;font-weight:700;color:${C.ink};">${x.head}</p>
      <p style="font-size:11.5px;line-height:1.6;color:${C.muted};margin-top:2px;">${x.body}</p>
    </li>`).join("");
  return `
  <div class="card" style="padding:16px 20px;">
    <p style="font-size:14.5px;font-weight:700;color:${C.ink};">${icon} ${titleZh}</p>
    <ul style="list-style:none;">${rows}</ul>
  </div>`;
}

const PAGE2 = `
  <div>
    <p class="kicker">先诊断，再训练</p>
    <h1 style="margin-top:10px;">为什么你卡在 <span class="red">5.5–6.5</span></h1>
    <p class="sub">绝大多数人的失分点不是「词汇量不够」，而是下面这八个。</p>
  </div>
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr;gap:12px;">
    ${painBlock("🎧", "听力的四个卡点", [
      { head: "「看得懂、听不出」", body: "词汇是「眼睛认识」，耳朵没建立连接。答案词听不出，是 5.5–6 分最大的失分原因。" },
      { head: "连读、弱读、吞音", body: "「not at all」听成「nada dall」，单靠刷题解决不了，必须做跟读和辨音训练。" },
      { head: "同义替换反应慢", body: "题干说 costly，录音说 expensive——雅思听力的本质考点就是 paraphrase。" },
      { head: "走神与丢定位", body: "Section 3/4 一旦走神连丢 3 题，需要限时审题 + 预测训练。" },
    ])}
    ${painBlock("🎤", "口语的四个卡点", [
      { head: "背模板痕迹重", body: "6 分考官一听就识破；7 分要求「讨论各种话题时能自然展开」，靠真实表达量。" },
      { head: "词汇认识但不会用", body: "缺的不是难词，是地道搭配（collocation）和口语化的小词。" },
      { head: "时态等语法错误频繁", body: "GRA 项 7 分要求「频繁说出无错句」，时态混乱直接锁死 6 分。" },
      { head: "Part 2 撑不满 2 分钟", body: "Part 3 展不开——缺结构和素材池，不是缺临场发挥。" },
    ])}
  </div>
  <p style="margin-top:14px;font-size:11.5px;line-height:1.6;color:${C.muted};">
    每个卡点都有对应的处方（见训练指南）：听不出 → 精听四步法跟读；拼写错 → 语料库专项；反应慢 → 变速训练。</p>`;

// ---------- P3 精听四步法 + 错因分类 ----------
const PAGE3 = `
  <div>
    <p class="kicker">每天 30 分钟的核心</p>
    <h1 style="margin-top:10px;">精听<span class="red">四步法</span></h1>
    <p class="sub">每天只精听一个短素材（3–6 分钟），但必须做完四步。「精听 15 分钟 × 每天坚持」远胜「精听 3 小时 × 每周一次」。</p>
  </div>
  <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px;">
    <div class="card" style="padding:14px 18px;"><p style="font-size:13.5px;font-weight:700;color:${C.ink};">① 盲听 + 听写</p><p style="font-size:12px;line-height:1.6;color:${C.muted};margin-top:3px;">逐句听写，每句最多放 3 遍，放不出来先空着继续。目标不是全对，而是暴露听力盲区。</p></div>
    <div class="card" style="padding:14px 18px;"><p style="font-size:13.5px;font-weight:700;color:${C.ink};">② 对答案、归错因</p><p style="font-size:12px;line-height:1.6;color:${C.muted};margin-top:3px;">逐词核对，把每个错误归入四类（见下表）。四类错因对应四种处方。</p></div>
    <div class="card" style="padding:14px 18px;"><p style="font-size:13.5px;font-weight:700;color:${C.ink};">③ 跟读模仿</p><p style="font-size:12px;line-height:1.6;color:${C.muted};margin-top:3px;">把听不出的句子跟读到「和录音语气一致」——记声音而不是字母，跳过这步精听效果减半。</p></div>
    <div class="card" style="padding:14px 18px;"><p style="font-size:13.5px;font-weight:700;color:${C.ink};">④ 48 小时内重听</p><p style="font-size:12px;line-height:1.6;color:${C.muted};margin-top:3px;">第二天先盲听昨天的素材（不写），全部听懂才过关；周末合并重听本周错句。</p></div>
  </div>
  <div style="margin-top:14px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:.18em;color:${C.muted};">错因分类 → 处方</p>
    <div class="card" style="margin-top:8px;padding:12px 18px;font-size:12px;">
      <p style="padding:5px 0;border-bottom:1px solid ${C.line};"><b>词汇不认识</b> → 背了会用：例句 + 复述里强制使用</p>
      <p style="padding:5px 0;border-bottom:1px solid ${C.line};"><b>听音失认</b>（看原文认识，听不出）→ 该句跟读 10 遍 + 精听重听</p>
      <p style="padding:5px 0;border-bottom:1px solid ${C.line};"><b>拼写/单复数</b>（听对写错）→ 语料库专项 + 统一检查的固定动作</p>
      <p style="padding:5px 0;"><b>反应慢/走神</b> → 1.25–1.6 倍速训练 + 审题预测</p>
    </div>
  </div>`;

// ---------- P4 三档画像与毕业标准 ----------
function tierCard(label, sub, rows, grad) {
  return `
  <div class="card" style="padding:16px 18px;">
    <p style="font-size:10px;font-weight:700;letter-spacing:.16em;color:${C.accent};">${label}</p>
    <p style="margin-top:3px;font-size:15px;font-weight:700;color:${C.ink};font-family:'Songti SC',Georgia,serif;">${sub}</p>
    <p style="margin-top:6px;font-size:11.5px;color:${C.muted};">${rows}</p>
    <p style="margin-top:8px;font-size:11px;color:${C.ok};">毕业标准：${grad}</p>
  </div>`;
}

const PAGE4 = `
  <div>
    <p class="kicker">你在哪一档，就只看哪一页</p>
    <h1 style="margin-top:10px;">三档画像与<span class="red">毕业标准</span></h1>
    <p class="sub">同一套「听写 + 跟读 + 复述」，三个阶段的重点完全不同。定位测试只决定起点；达标就升档，4 周没达标回常见坑排查方法。</p>
  </div>
  <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
    ${tierCard("第一档", "5–7 分 · 筑基突破",
      "听力 19–29 / 口语 5.0–6.5。主要矛盾：语音辨识 + 开口量。核心动作：语料库听写、一句三遍、Part 1 条件反射。",
      "真题稳定 30+，Part 2 撑满 2 分钟 → 升档")}
    ${tierCard("第二档", "7–8 分 · 强化精进",
      "听力 30–36 / 口语 7.0–8.0。主要矛盾：精度（同义替换/小错）+ 地道度。核心动作：真题错题归因、替换体系、口语四项逐项破。",
      "真题 37+，口语四项自评 8 → 升档")}
    ${tierCard("第三档", "8–9 分 · 满分冲刺",
      "听力 37–40 / 口语 8.0–9.0。主要矛盾：抗噪（口音/语用）+ 毫不费力感。核心动作：母语者内容浸泡、即兴论述、月度标定。",
      "满分画像全达成（官方 9 分描述）")}
  </div>
  <p style="margin-top:14px;font-size:11.5px;line-height:1.6;color:${C.muted};">
    剑桥真题怎么刷、语料库怎么用、GitHub 上哪些开源工具值得装，站内资源库都替你核查并整理好了。</p>`;

// ---------- P5 工具与素材 ----------
function toolCard(icon, titleZh, bodyZh, tagZh) {
  return `
  <div class="card" style="padding:14px 18px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <p style="font-size:14px;font-weight:700;color:${C.ink};">${icon} ${titleZh}</p>
      <span style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:${C.accent};border:1px solid ${C.accent};border-radius:2px;padding:2px 8px;white-space:nowrap;">${tagZh}</span>
    </div>
    <p style="margin-top:5px;font-size:11.5px;line-height:1.6;color:${C.muted};">${bodyZh}</p>
  </div>`;
}

const PAGE5 = `
  <div>
    <p class="kicker">训练的原料与动作都在这一站</p>
    <h1 style="margin-top:10px;">每日素材 + <span class="red">听写工作台</span></h1>
    <p class="sub">纯前端实现，音频与记录都不出本机；与评估平台（English Progress Lab）同源互通。</p>
  </div>
  <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
    ${toolCard("📡", "BBC / CNN 每日播客流", "GitHub Actions 每天自动同步最新一期 BBC 6 Minute English / Global News / CNN 10，只放行官方 https 音频，失效自动引导原文链接。", "每日自动更新")}
    ${toolCard("🎧", "逐句精听听写工作台", "本地拖入任意音频 + 粘贴逐字稿：0.5–2× 变速、A-B 区间循环、逐句盲听、三档错因统计（全对 / 拼写错 / 未听出）。", "历史近 7 天正确率")}
    ${toolCard("🗣", "影子跟读 + 复述法", "语音语调的主训练：盲听抓大意 → 逐句暂停跟读 → 同步影子落后 1–2 词；复述训练打通输入到输出。", "FC 与 P 的主处方")}
    ${toolCard("📚", "资源库与英美剧单", "剑桥真题刷法、王陆语料库用法、GitHub 开源工具核查清单、按档位精选的播客与剧单。", "按档位精选")}
  </div>
  <div style="margin-top:14px;background:${C.accentSoft};border:1px solid #ecd0c8;padding:12px 16px;border-radius:2px;">
    <p style="font-size:11.5px;line-height:1.7;color:${C.ink};">
      🧪 <b>想量化进步？</b>姊妹站 English Progress Lab（英语进阶实验室）提供五维评估、IELTS 预估与 14 天追踪——同一浏览器内可直接读取本站的打卡与听写记录，扫码见尾页。</p>
  </div>`;

// ---------- P6 行动页 ----------
const PAGE6 = (qrDataUrl) => `
  <div>
    <p class="kicker">开始你的第一天</p>
    <h1 style="margin-top:10px;">3 分钟定位测试，<br/>从<span class="red">短板</span>开始练</h1>
    <p class="sub">保存本图长按识别，或用微信 / 小红书 / 系统相机扫码，也可以直接访问下方链接。</p>
  </div>
  <div class="card" style="margin-top:20px;padding:26px 24px;text-align:center;">
    <img class="qr" src="${qrDataUrl}" alt="QR code" style="width:250px;height:250px;" />
    <p style="margin-top:12px;font-size:12px;font-weight:600;color:${C.link};word-break:break-all;">${SITE_URL}</p>
    <p style="margin-top:6px;font-size:11.5px;color:${C.muted};">电脑 / 手机浏览器直接访问 · 建议先做「水平测试」确认起点档位</p>
    <div style="margin-top:16px;border-top:1px solid ${C.line};padding-top:14px;text-align:left;">
      <p style="font-size:12px;line-height:1.7;color:${C.ink};">🔒 <b>隐私说明</b>：纯前端架构——音频、听写记录与打卡数据只存在你自己的设备浏览器里，不上传服务器。</p>
      <p style="margin-top:6px;font-size:12px;line-height:1.7;color:${C.ink};">⚖️ <b>诚实边界</b>：定位测试仅作训练分组参考（短板决定起点），不是标准化雅思测评；本站也绝不生成任何「保分承诺」。</p>
      <p style="margin-top:6px;font-size:12px;line-height:1.7;color:${C.ink};">🧪 <b>打卡彩蛋</b>：配合姊妹站 English Progress Lab，用五维评估 + 14 天追踪量化每一次真实进步。</p>
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
      <span class="chip">免费 · 免注册</span>
      <span class="chip">三档训练体系</span>
      <span class="chip">每日素材更新</span>
    </div>
  </div>`;

// ---------- 生成与验收（与 EPL 生成器同一套验收口径） ----------
const PAGES = [
  { file: "01-cover.png", html: (qr) => chrome(PAGE1, "01 / 06") },
  { file: "02-pain-points.png", html: (qr) => chrome(PAGE2, "02 / 06") },
  { file: "03-intensive.png", html: (qr) => chrome(PAGE3, "03 / 06") },
  { file: "04-three-tiers.png", html: (qr) => chrome(PAGE4, "04 / 06") },
  { file: "05-tools-and-feeds.png", html: (qr) => chrome(PAGE5, "05 / 06") },
  { file: "06-try-now.png", html: (qr) => chrome(PAGE6(qr), "06 / 06") },
];

function pngSize(file) {
  const buf = readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

async function decodeQr(page) {
  return page.evaluate(() => {
    const img = document.querySelector("img.qr");
    if (!img) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const { data, width, height } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    return { data: Array.from(data), width, height };
  }).then((r) => (r ? jsQR(new Uint8ClampedArray(r.data), r.width, r.height) : null));
}

async function main() {
  if (!existsSync(join(__dirname, "..", "node_modules"))) {
    console.error("请先 npm install");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const qrDataUrl = await QRCode.toDataURL(SITE_URL, {
    width: 560, margin: 1, errorCorrectionLevel: "M",
    color: { dark: "#101418", light: "#FFFFFF" },
  });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 960 }, deviceScaleFactor: 2 });
  const failures = [];
  const check = (name, cond, detail = "") => {
    console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : ` — ${detail}`}`);
    if (!cond) failures.push(name);
  };

  for (const spec of PAGES) {
    await page.setContent(spec.html(qrDataUrl), { waitUntil: "load" });
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      sh: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    }));
    check(`${spec.file} 无横向溢出`, m.sw <= 720, `scrollWidth=${m.sw}`);
    check(`${spec.file} 无纵向截断`, m.sh <= 960, `scrollHeight=${m.sh}`);

    const file = join(OUT_DIR, spec.file);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 720, height: 960 } });
    const size = pngSize(file);
    check(`${spec.file} 分辨率 1440×1920`, size.w === 1440 && size.h === 1920, `${size.w}×${size.h}`);
  }

  await page.setContent(PAGES[5].html(qrDataUrl), { waitUntil: "load" });
  const decoded = await decodeQr(page);
  check("P6 二维码实扫解码指向本站", decoded?.data === SITE_URL, `decoded=${decoded?.data}`);
  await browser.close();

  console.log(`\n输出目录：${OUT_DIR}`);
  if (failures.length > 0) {
    console.error(`${failures.length} 项验收未通过`);
    process.exit(1);
  }
  console.log("全部验收通过 ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
