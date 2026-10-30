/* 水平定位测试（训练分组参考，非标准化测评）：
   词频分级词汇量估算 + 浏览器 TTS 盲听 + 口语自评 → 按短板给出训练起点档。
   完成度由 LS7Core.placementResult 强校验（全部项目作答、盲听每句至少播放一次）。 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var core = window.LS7Core;
  var TIER_PAGES = { "5-7": "tier57.html", "7-8": "tier78.html", "8-9": "band9.html" };

  /* ---------- 模块 A：词汇量估算 ---------- */
  var VOCAB_ROWS = [
    { band: "约 2000（最常用词）", words: "camera, decide, weather, agree, expensive, holiday, promise, neighbour" },
    { band: "约 2000–4000", words: "abandon, anxiety, evidence, persuade, consequence, frequent, graduate, reaction" },
    { band: "约 4000–6500", words: "ambiguous, advocate, constraint, compensate, dilemma, entrepreneur, interval, subtle" },
    { band: "约 6500–10000", words: "aggregate, coherent, dubious, inherently, plausible, stipulate, versatile, threshold" },
    { band: "约 10000–13000+", words: "atrophy, ebullient, lampoon, obfuscate, perfunctory, quixotic, sycophant, vicarious" }
  ];
  var vocabKnown = new Array(VOCAB_ROWS.length).fill(null);
  var vocabBox = $("#vocab-rows");
  VOCAB_ROWS.forEach(function (row, i) {
    var div = core.makeEl(document, "div", "vrow");
    var meta = core.makeEl(document, "div", "vmeta");
    meta.appendChild(core.makeEl(document, "b", null, row.band));
    meta.appendChild(core.makeEl(document, "span", null, row.words));
    var btns = core.makeEl(document, "div", "vbtns");
    [["1", "基本都认识"], ["0", "有生词"]].forEach(function (pair) {
      var b = core.makeEl(document, "button", null, pair[1]);
      b.setAttribute("data-i", String(i));
      b.setAttribute("data-v", pair[0]);
      btns.appendChild(b);
    });
    div.appendChild(meta);
    div.appendChild(btns);
    vocabBox.appendChild(div);
  });
  vocabBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    vocabKnown[i] = +b.getAttribute("data-v");
    vocabBox.querySelectorAll('[data-i="' + i + '"]').forEach(function (x) {
      x.classList.toggle("picked", x === b);
    });
  });

  /* ---------- 模块 B：TTS 盲听（需先播放才能标记） ---------- */
  var SENTENCES = [
    { rate: 0.95, text: "I usually take the bus to work, but today the traffic was terrible, so I arrived twenty minutes late." },
    { rate: 1.0, text: "Apparently the meeting's been put off until Thursday, which honestly suits me fine — I could do with a bit more time to prepare." },
    { rate: 1.0, text: "The study found that while caffeine improved participants' reaction times in the short term, these effects tended to wear off once tolerance developed over consecutive days." },
    { rate: 1.0, text: "To be fair, the whole scheme was a bit of a shot in the dark, but against all odds it paid off — though whether that holds up in the long run is another matter." }
  ];
  var listenMarks = new Array(SENTENCES.length).fill(null);
  var playCounts = new Array(SENTENCES.length).fill(0);
  var synth = window.speechSynthesis;
  var voice = null;
  function pickVoice() {
    var voices = synth ? synth.getVoices() : [];
    var prefer = ["Daniel", "Google UK English Male", "Google UK English", "Samantha", "Google US English"];
    for (var p = 0; p < prefer.length; p++) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name.indexOf(prefer[p]) >= 0 && /^en/i.test(voices[i].lang)) return voices[i];
      }
    }
    for (var j = 0; j < voices.length; j++) { if (/^en/i.test(voices[j].lang)) return voices[j]; }
    return null;
  }
  if (synth) {
    voice = pickVoice();
    synth.onvoiceschanged = function () { voice = pickVoice(); };
  } else {
    $("#tts-warn").style.display = "";
  }
  var listenBox = $("#listen-rows");
  SENTENCES.forEach(function (s, i) {
    var div = core.makeEl(document, "div", "lrow");
    var head = core.makeEl(document, "div", "lhead");
    head.appendChild(core.makeEl(document, "b", null, "第 " + (i + 1) + " 句"));
    head.appendChild(core.makeEl(document, "span", "marks", "每句最多播 2 遍，播放后才能标记"));
    var btns = core.makeEl(document, "div", "lbtns");
    var play = core.makeEl(document, "button", "play", "▶ 播放");
    play.setAttribute("data-i", String(i));
    btns.appendChild(play);
    [["2", "✅ 完全听懂"], ["1", "🟡 听懂大意"], ["0", "❌ 基本没懂"]].forEach(function (pair) {
      var b = core.makeEl(document, "button", null, pair[1]);
      b.setAttribute("data-i", String(i));
      b.setAttribute("data-v", pair[0]);
      btns.appendChild(b);
    });
    div.appendChild(head);
    div.appendChild(btns);
    listenBox.appendChild(div);
  });
  listenBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    if (b.classList.contains("play")) {
      if (playCounts[i] >= 2 || !synth) return;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(SENTENCES[i].text);
      u.lang = voice ? voice.lang : "en-GB";
      if (voice) u.voice = voice;
      u.rate = SENTENCES[i].rate;
      playCounts[i]++;
      b.textContent = "▶ 播放（已 " + playCounts[i] + "/2）";
      if (playCounts[i] >= 2) b.disabled = true;
      synth.speak(u);
      return;
    }
    if (playCounts[i] < 1) { alert("请先播放第 " + (i + 1) + " 句，再标记听懂程度。"); return; }
    listenMarks[i] = +b.getAttribute("data-v");
    listenBox.querySelectorAll('[data-i="' + i + '"]:not(.play)').forEach(function (x) {
      x.classList.toggle("picked", x === b);
    });
  });

  /* ---------- 模块 C：口语自评 ---------- */
  var SPEAK_QS = [
    "用英语描述最近一周的一件事，我能不间断说满 1 分钟。",
    "回听自己的口语录音：每个词都清晰可辨，考官几乎不用费力。",
    "说过去发生的事时，我基本不会用错时态。",
    "我能顺手用出 5 个以上习语或地道搭配（不是单词，是搭配）。",
    "随机抽象话题（如“社交媒体是否让人更孤独”），我能直接用英语展开 2 分钟。",
    "说长句时我直接用英语构思，不需要先想中文再翻译。"
  ];
  var speakMarks = new Array(SPEAK_QS.length).fill(null);
  var speakBox = $("#speak-rows");
  SPEAK_QS.forEach(function (q, i) {
    var div = core.makeEl(document, "div", "srow");
    div.appendChild(core.makeEl(document, "p", null, (i + 1) + ". " + q));
    var btns = core.makeEl(document, "div", "sbtns");
    [["1", "符合"], ["0", "不符合"]].forEach(function (pair) {
      var b = core.makeEl(document, "button", null, pair[1]);
      b.setAttribute("data-i", String(i));
      b.setAttribute("data-v", pair[0]);
      btns.appendChild(b);
    });
    div.appendChild(btns);
    speakBox.appendChild(div);
  });
  speakBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    speakMarks[i] = +b.getAttribute("data-v");
    speakBox.querySelectorAll('[data-i="' + i + '"]').forEach(function (x) {
      x.classList.toggle("picked", x === b);
    });
  });

  /* ---------- 生成结果（完成度强校验 + DOM 安全构建） ---------- */
  $("#btn-result").addEventListener("click", function () {
    var res = core.placementResult({
      vocabRows: vocabKnown,
      listenMarks: listenMarks,
      speakMarks: speakMarks,
      playCounts: playCounts
    });
    if (!res.complete) {
      alert("还有未完成的项目，暂时无法生成结果：\n\n· " + res.missing.join("\n· "));
      return;
    }
    var box = $("#result");
    box.textContent = "";

    var grid = core.makeEl(document, "div", "res-grid");
    [
      { label: "词汇量 " + res.vocabEst, tier: res.tiers.vocab },
      { label: "盲听得分 " + res.listenPct + "%", tier: res.tiers.listen },
      { label: "口语自评 " + res.speakPct + "%", tier: res.tiers.speak }
    ].forEach(function (d) {
      var stat = core.makeEl(document, "div", "stat");
      stat.appendChild(core.makeEl(document, "b", null, d.tier));
      stat.appendChild(core.makeEl(document, "span", null, d.label));
      grid.appendChild(stat);
    });
    box.appendChild(grid);

    var verdict = core.makeEl(document, "p", "verdict");
    verdict.appendChild(document.createTextNode("短板在 "));
    verdict.appendChild(core.makeEl(document, "b", null, res.weakestLabel));
    verdict.appendChild(document.createTextNode("——训练从这一档起步。"));
    box.appendChild(verdict);

    var note = core.makeEl(document, "p", "small");
    note.textContent = "本结果是训练分组参考（短板决定起点），不是标准化雅思测评；档位请以官方真题与考官评定为准。四个模块已全部完成，重测会覆盖本次结果。";
    box.appendChild(note);

    var cta = core.makeEl(document, "p", null);
    var go = core.makeEl(document, "a", "btn", "进入" + res.weakestLabel + " →");
    go.href = TIER_PAGES[res.weakest];
    var all = core.makeEl(document, "a", "btn ghost", "查看分档总览");
    all.href = "tiers.html";
    cta.appendChild(go);
    cta.appendChild(document.createTextNode(" "));
    cta.appendChild(all);
    box.appendChild(cta);

    box.style.display = "";
    try {
      localStorage.setItem("ls7-placement", JSON.stringify({ tier: res.weakest, date: core.localDateKey() }));
    } catch (e) {}
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------- 上次结果提示 ---------- */
  try {
    var last = JSON.parse(localStorage.getItem("ls7-placement") || "null");
    if (last && last.tier) {
      var box = $("#last-result");
      box.textContent = "";
      box.appendChild(document.createTextNode("上次测试（" + last.date + "）把你定在 "));
      box.appendChild(core.makeEl(document, "b", null, core.TIER_LABELS[last.tier] || last.tier));
      box.appendChild(document.createTextNode("。状态变化后（比如精听 4 周）建议重测；档位页见 "));
      var a = core.makeEl(document, "a", null, "分档总览");
      a.href = "tiers.html";
      box.appendChild(a);
      box.appendChild(document.createTextNode("。"));
      box.style.display = "";
    }
  } catch (e) {}
})();
