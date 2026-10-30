/* LS7Core 单元测试（node --test）。
   重点：恶意输入回归（XSS / 链接注入）、听写统计、定档逻辑与完成度校验。 */
const test = require("node:test");
const assert = require("node:assert");
const core = require("../assets/core.js");

/* ---------- 极简假 DOM（仅实现 core.js 用到的能力，且绝不实现 innerHTML） ---------- */
function makeNode(tag) {
  return {
    tagName: tag,
    className: "",
    textContent: null,
    children: [],
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    appendChild(c) { this.children.push(c); },
  };
}
function fakeDoc() {
  return { createElement: (tag) => makeNode(tag) };
}
function walk(node, fn) {
  fn(node);
  (node.children || []).forEach((c) => walk(c, fn));
}

/* ---------- sanitizeLink：链接协议白名单 ---------- */
test("sanitizeLink 放行 http/https", () => {
  assert.equal(core.sanitizeLink("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(core.sanitizeLink("  http://example.com  "), "http://example.com");
  assert.equal(core.sanitizeLink("HTTPS://EXAMPLE.COM/X"), "HTTPS://EXAMPLE.COM/X");
});

test("sanitizeLink 拦截 javascript:/data:/vbscript: 与非字符串（XSS 回归）", () => {
  for (const bad of [
    "javascript:alert(1)",
    " JAVASCRIPT:alert(1)",
    "java\tscript:alert(1)".replace("\t", ""), // 变体：拼词后仍无协议前缀 → 拦截
    "JaVaScRiPt:alert(document.cookie)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "//evil.example/x",
    "mailto:evil@example.com",
    42, null, undefined, {},
  ]) {
    assert.equal(core.sanitizeLink(bad), null, `应拦截: ${bad}`);
  }
});

/* ---------- renderFeedList：RSS 内容（不可信）安全渲染 ---------- */
const MALICIOUS_FEED = [{
  name: "恶意源",
  items: [{
    title: '<img src=x onerror="alert(1)">',
    link: "javascript:alert(document.cookie)",
    date: "Fri, 30 Oct 2026 00:00:00 GMT",
  }, {
    title: "正常标题",
    link: "https://example.com/ok",
    date: "Fri, 30 Oct 2026 01:00:00 GMT",
  }],
}];

test("renderFeedList：恶意标题只成为文本节点，绝不成为标签", () => {
  const doc = fakeDoc();
  const container = makeNode("div");
  core.renderFeedList(doc, container, MALICIOUS_FEED, 6);
  let sawPayloadAsText = false;
  let sawMarkupInjection = false;
  walk(container, (n) => {
    if (typeof n.textContent === "string" && n.textContent.includes('<img src=x onerror="alert(1)">')) {
      sawPayloadAsText = true;
      if (n.tagName !== "#text" && n.children.length === 0) sawMarkupInjection = false;
    }
    if (typeof n.textContent === "string" && n.tagName !== undefined && n.children.length &&
        n.textContent.includes("onerror")) {
      // textContent 里含 payload 且有子节点 → 说明被当 HTML 解析过（假 DOM 不会，真 DOM 会）
      sawMarkupInjection = true;
    }
  });
  assert.ok(sawPayloadAsText, "payload 应以 textContent 文本出现");
  assert.equal(sawMarkupInjection, false, "payload 不得进入任何含子节点的节点（防止被解析为标签）");
});

test("renderFeedList：javascript: 链接被过滤为纯文本，https 链接保留 rel=noopener", () => {
  const doc = fakeDoc();
  const container = makeNode("div");
  core.renderFeedList(doc, container, MALICIOUS_FEED, 6);
  const links = [];
  walk(container, (n) => {
    if (n.tagName === "a") links.push(n);
  });
  assert.equal(links.length, 1, "只应有 1 个 <a>（恶意链接降级为 span 文本）");
  assert.equal(links[0].attributes.href, "https://example.com/ok");
  assert.ok((links[0].attributes.rel || "").includes("noopener"), "外链必须带 noopener");
  const spans = [];
  walk(container, (n) => { if (n.tagName === "span" && n.textContent === "<img src=x onerror=\"alert(1)\">") spans.push(n); });
  assert.equal(spans.length, 1, "恶意条目应以纯文本 span 呈现");
});

test("renderFeedList：空源跳过、textContent 先清空容器", () => {
  const doc = fakeDoc();
  const container = makeNode("div");
  container.textContent = "旧内容占位";
  core.renderFeedList(doc, container, [{ name: "空源", items: [] }], 6);
  assert.equal(container.children.length, 1, "空源只留下空 grid");
  const grid = container.children[0];
  assert.equal(grid.children.length, 0, "无条目的源不渲染卡片");
});

/* ---------- calcDictationScore ---------- */
test("calcDictationScore：空数据 acc 为 null", () => {
  assert.deepEqual(core.calcDictationScore([]), { done: 0, ok: 0, close: 0, miss: 0, acc: null });
  assert.equal(core.calcDictationScore(null).acc, null);
});

test("calcDictationScore：ok=1 close=0.5 miss=0", () => {
  const r = core.calcDictationScore(["ok", "close", "miss", "ok"]);
  assert.equal(r.done, 4);
  assert.equal(r.ok, 2);
  assert.equal(r.close, 1);
  assert.equal(r.miss, 1);
  assert.equal(r.acc, 63); // (2 + 0.5) / 4 = 62.5% → 63
});

/* ---------- localDateKey（本地时区） ---------- */
test("localDateKey 用本地时区而非 UTC", () => {
  assert.equal(core.localDateKey(new Date(2026, 9, 31, 23, 59)), "2026-10-31");
  assert.equal(core.localDateKey(new Date(2026, 0, 1, 0, 0)), "2026-01-01");
});

/* ---------- tierOf / vocabEstimate ---------- */
test("tierOf 分组阈值边界（45 / 75）", () => {
  assert.equal(core.tierOf(0), "5-7");
  assert.equal(core.tierOf(44), "5-7");
  assert.equal(core.tierOf(45), "7-8");
  assert.equal(core.tierOf(74), "7-8");
  assert.equal(core.tierOf(75), "8-9");
  assert.equal(core.tierOf(100), "8-9");
});

test("vocabEstimate 按连续认识行数估算", () => {
  assert.equal(core.vocabEstimate([0, 1, 1, 1, 1]).est, "≈ 3000 或以下");
  assert.equal(core.vocabEstimate([1, 1, 1, null, null]).est, "≈ 9000");
  assert.equal(core.vocabEstimate([1, 1, 1, 1, 1]).est, "≈ 12000+");
  assert.equal(core.vocabEstimate([1, 1, 1, 0, 1]).est, "≈ 9000"); // 连续中断即止
  assert.equal(core.vocabEstimate([]).est, "≈ 3000 或以下");
});

/* ---------- placementResult：完成度强校验 ---------- */
const GOOD = {
  vocabRows: [1, 1, 1, 1, 1],
  listenMarks: [2, 2, 2, 2],
  speakMarks: [1, 1, 1, 1, 1, 1],
  playCounts: [2, 1, 1, 2],
};

test("完整作答时结果有效且短板正确", () => {
  const r = core.placementResult(GOOD);
  assert.equal(r.complete, true);
  assert.equal(r.tiers.vocab, "8-9");
  assert.equal(r.tiers.listen, "8-9");
  assert.equal(r.tiers.speak, "8-9");
  assert.equal(r.weakest, "8-9");
});

test("弱项决定起点档（短板定档）", () => {
  const r = core.placementResult({
    vocabRows: [1, 1, 1, 1, 1],
    listenMarks: [0, 0, 0, 0],   // 盲听全没懂 → 5-7
    speakMarks: [1, 1, 1, 1, 1, 1],
    playCounts: [1, 1, 1, 1],
  });
  assert.equal(r.tiers.listen, "5-7");
  assert.equal(r.weakest, "5-7");
  assert.equal(r.weakestLabel, "5–7 分档");
});

test("未答完的项目会被逐模块指出（回归：此前允许部分作答）", () => {
  const r1 = core.placementResult({ ...GOOD, vocabRows: [1, null, 1, 1, 1] });
  assert.equal(r1.complete, false);
  assert.ok(r1.missing.some((m) => m.includes("模块 A")));

  const r2 = core.placementResult({ ...GOOD, speakMarks: [1, 1, null, 1, 1, 1] });
  assert.equal(r2.complete, false);
  assert.ok(r2.missing.some((m) => m.includes("模块 C")));

  const r3 = core.placementResult({ ...GOOD, listenMarks: [2, 2, null, 2] });
  assert.equal(r3.complete, false);
  assert.ok(r3.missing.some((m) => m.includes("模块 B")));

  // 没播放就标记 → 同样视为未完成
  const r4 = core.placementResult({ ...GOOD, playCounts: [1, 1, 1, 0] });
  assert.equal(r4.complete, false);
  assert.ok(r4.missing.some((m) => m.includes("模块 B")));
});

test("听写重复评分的差量调整由调用方保证（本测试锁定统计口径）", () => {
  // 同句先 ok 后改 close：统计应从 {ok:1} 变为 {close:1}，总量不增
  const first = core.calcDictationScore(["ok"]);
  assert.deepEqual([first.ok, first.close], [1, 0]);
  const revised = core.calcDictationScore(["close"]);
  assert.deepEqual([revised.ok, revised.close], [0, 1]);
});
