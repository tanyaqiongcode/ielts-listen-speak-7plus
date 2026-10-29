/* 水平定位测试：词汇量估算（词频分级）+ 浏览器 TTS 盲听 + 口语自评 → 按短板定档 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var TIERS = { "5-7": "5–7 分档", "7-8": "7–8 分档", "8-9": "8–9 分档" };

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
    var div = document.createElement("div");
    div.className = "vrow";
    div.innerHTML = '<div class="vmeta"><b>' + row.band + "</b><span>" + row.words + "</span></div>" +
      '<div class="vbtns"><button data-i="' + i + '" data-v="1">基本都认识</button><button data-i="' + i + '" data-v="0">有生词</button></div>';
    vocabBox.appendChild(div);
  });
  vocabBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    vocabKnown[i] = +b.getAttribute("data-v");
    var btns = vocabBox.querySelectorAll('[data-i="' + i + '"]');
    btns.forEach(function (x) { x.classList.toggle("picked", x === b); });
  });
  // 估算：从第 1 行起连续"都认识"的行数
  function vocabScore() {
    var consecutive = 0;
    while (consecutive < vocabKnown.length && vocabKnown[consecutive] === 1) consecutive++;
    if (consecutive === 0) return { est: "≈ 3000 或以下", pct: 0 };
    if (consecutive === 1) return { est: "≈ 4000", pct: 25 };
    if (consecutive === 2) return { est: "≈ 6000", pct: 50 };
    if (consecutive === 3) return { est: "≈ 9000", pct: 75 };
    return { est: "≈ 12000+", pct: 100 };
  }

  /* ---------- 模块 B：TTS 盲听 ---------- */
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
    var div = document.createElement("div");
    div.className = "lrow";
    div.innerHTML =
      '<div class="lhead"><b>第 ' + (i + 1) + " 句</b><span class=\"marks\">每句最多播 2 遍</span></div>" +
      '<div class="lbtns">' +
      '<button class="play" data-i="' + i + '">▶ 播放</button>' +
      '<button data-i="' + i + '" data-v="2">✅ 完全听懂</button>' +
      '<button data-i="' + i + '" data-v="1">🟡 听懂大意</button>' +
      '<button data-i="' + i + '" data-v="0">❌ 基本没懂</button>' +
      "</div>";
    listenBox.appendChild(div);
  });
  listenBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    if (b.classList.contains("play")) {
      if (playCounts[i] >= 2) return;
      if (!synth) return;
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
    listenMarks[i] = +b.getAttribute("data-v");
    var btns = listenBox.querySelectorAll('[data-i="' + i + '"]:not(.play)');
    btns.forEach(function (x) { x.classList.toggle("picked", x === b); });
  });
  function listenScore() {
    var total = 0, answered = 0;
    listenMarks.forEach(function (m, i) {
      if (m === null && playCounts[i] === 0) return; // 没听过的不计
      answered++;
      total += m || 0;
    });
    var pct = answered ? Math.round(total / (answered * 2) * 100) : null;
    return { pct: pct, answered: answered };
  }

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
    var div = document.createElement("div");
    div.className = "srow";
    div.innerHTML = '<p>' + (i + 1) + ". " + q + "</p>" +
      '<div class="sbtns"><button data-i="' + i + '" data-v="1">符合</button><button data-i="' + i + '" data-v="0">不符合</button></div>';
    speakBox.appendChild(div);
  });
  speakBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    speakMarks[i] = +b.getAttribute("data-v");
    var btns = speakBox.querySelectorAll('[data-i="' + i + '"]');
    btns.forEach(function (x) { x.classList.toggle("picked", x === b); });
  });
  function speakScore() {
    var yes = speakMarks.filter(function (m) { return m === 1; }).length;
    return Math.round(yes / SPEAK_QS.length * 100);
  }

  /* ---------- 定档 ---------- */
  function tierOf(pct) {
    if (pct >= 75) return "8-9";
    if (pct >= 45) return "7-8";
    return "5-7";
  }
  function tierRank(t) { return { "5-7": 1, "7-8": 2, "8-9": 3 }[t]; }

  $("#btn-result").addEventListener("click", function () {
    var v = vocabScore();
    var l = listenScore();
    var s = speakScore();
    if (vocabKnown.every(function (x) { return x === null; })) { alert("请先完成模块 A（词汇量估算）"); return; }
    if (!l.answered) { alert("请先完成模块 B（盲听测试）：点「▶ 播放」听句子并标记听懂程度"); return; }
    if (speakMarks.every(function (x) { return x === null; })) { alert("请先完成模块 C（口语自评）"); return; }

    var tV = tierOf(v.pct), tL = tierOf(l.pct), tS = tierOf(s);
    var weakest = [tV, tL, tS].sort(function (a, b) { return tierRank(a) - tierRank(b); })[0];
    var tierPages = { "5-7": "tier57.html", "7-8": "tier78.html", "8-9": "band9.html" };
    var html =
      '<div class="res-grid">' +
      '<div class="stat"><b>' + tV + "</b><span>词汇量 " + v.est + "</span></div>" +
      '<div class="stat"><b>' + tL + "</b><span>盲听得分 " + l.pct + "%</span></div>" +
      '<div class="stat"><b>' + tS + "</b><span>口语自评 " + s + "%</span></div>" +
      "</div>" +
      '<p class="verdict">你的短板在 <b>' + TIERS[weakest] + "</b>——训练从这一档起步。" +
      (weakest !== tV && weakest !== tL && weakest !== tS ? "" :
        (tV !== weakest ? "词汇不是瓶颈，正常背词即可。" : "") +
        (tL !== weakest ? "听力好于短板，别降速练它。" : "") +
        (tS !== weakest ? "口语好于短板，保持每日开口。" : "")) +
      "</p>" +
      '<p><a class="btn" href="' + tierPages[weakest] + '">进入' + TIERS[weakest] + " →</a> " +
      '<a class="btn ghost" href="tiers.html">查看分档总览</a></p>';
    $("#result").innerHTML = html;
    $("#result").style.display = "";
    try { localStorage.setItem("ls7-placement", JSON.stringify({ tier: weakest, date: new Date().toISOString().slice(0, 10) })); } catch (e) {}
    $("#result").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // 上次测试结果提示
  try {
    var last = JSON.parse(localStorage.getItem("ls7-placement") || "null");
    if (last && last.tier) {
      $("#last-result").innerHTML = "上次测试（" + last.date + "）把你定在 <b>" + TIERS[last.tier] +
        "</b>。状态变化后（比如精听 4 周）建议重测；直接前往 <a href=\"tiers.html\">分档总览</a>。";
      $("#last-result").style.display = "";
    }
  } catch (e) {}
})();
