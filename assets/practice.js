/* 听写工作台：本地音频 + 自备原文，A-B 循环、变速、逐句听写核对（纯前端，数据不出本机）。
   安全约定：原文是用户粘贴的不可信内容，渲染一律 textContent（见 core.js）；统计走 LS7Core。 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var core = window.LS7Core;
  var audio = $("#audio");
  var lines = [];          // { text, status: null|'ok'|'close'|'miss' }
  var idx = 0;
  var loopOn = false;
  var ptA = null, ptB = null;
  var revealed = false;

  /* ---------- 音频载入 ---------- */
  function loadFile(file) {
    if (!file) return;
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(file);
    $("#file-hint").textContent = "🎵 " + file.name;
    $("#bench-body").style.display = "";
  }
  $("#audio-file").addEventListener("change", function (e) { loadFile(e.target.files[0]); });
  var drop = $("#drop-zone");
  ["dragover", "dragenter"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = "var(--accent)"; });
  });
  drop.addEventListener("dragleave", function () { drop.style.borderColor = ""; });
  drop.addEventListener("drop", function (e) {
    e.preventDefault(); drop.style.borderColor = "";
    loadFile(e.dataTransfer.files[0]);
  });

  /* ---------- 原文载入 ---------- */
  $("#load-text").addEventListener("click", function () {
    var raw = $("#transcript").value;
    lines = raw.split("\n").map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; })
      .map(function (s) { return { text: s, status: null }; });
    if (!lines.length) { alert("请先粘贴原文，每行一句。"); return; }
    idx = 0;
    renderList();
    showCurrent();
    $("#bench-body").style.display = "";
  });

  /* ---------- 速度 ---------- */
  $("#speed").addEventListener("change", function () { audio.playbackRate = parseFloat(this.value); });

  /* ---------- A/B 循环 ---------- */
  function fmt(t) {
    if (t == null) return "--.-";
    return t.toFixed(1) + "s";
  }
  $("#btn-a").addEventListener("click", function () { ptA = audio.currentTime; refreshAB(); });
  $("#btn-b").addEventListener("click", function () { ptB = audio.currentTime; refreshAB(); });
  $("#btn-clear-ab").addEventListener("click", function () { ptA = ptB = null; refreshAB(); });
  function refreshAB() {
    $("#mark-a").textContent = "A: " + fmt(ptA);
    $("#mark-b").textContent = "B: " + fmt(ptB);
  }
  $("#btn-loop").addEventListener("click", function () {
    loopOn = !loopOn;
    this.classList.toggle("primary", loopOn);
    this.textContent = loopOn ? "🔁 循环开" : "🔁 循环关";
  });
  $("#btn-play").addEventListener("click", function () {
    if (audio.paused) {
      if (ptA != null && audio.currentTime < ptA) audio.currentTime = ptA;
      audio.play();
    } else { audio.pause(); }
  });
  $("#btn-replay").addEventListener("click", function () {
    if (ptA != null) audio.currentTime = ptA;
    else audio.currentTime = Math.max(0, audio.currentTime - 5);
    audio.play();
  });
  audio.addEventListener("timeupdate", function () {
    if (loopOn && ptA != null && ptB != null && ptB > ptA && audio.currentTime >= ptB) {
      audio.currentTime = ptA;
    }
  });
  audio.addEventListener("play", function () { $("#btn-play").textContent = "⏸ 暂停"; });
  audio.addEventListener("pause", function () { $("#btn-play").textContent = "▶ 播放"; });

  /* ---------- 逐句流程 ---------- */
  function renderList() {
    var box = $("#line-list");
    box.textContent = "";
    lines.forEach(function (l, i) {
      var icon = l.status === "ok" ? "✅" : l.status === "close" ? "🟡" : l.status === "miss" ? "❌" : "·";
      var div = document.createElement("div");
      div.className = "line" + (i === idx ? " current" : "");
      if (i === idx) div.style.fontWeight = "700";
      div.textContent = icon + " " + (i + 1) + ". " + (l.status ? l.text : "……");
      div.addEventListener("click", function () { idx = i; showCurrent(); });
      box.appendChild(div);
    });
    var stats = core.calcDictationScore(lines.map(function (l) { return l.status; }));
    $("#progress").textContent = stats.done + " / " + lines.length + " 句";
    $("#acc").textContent = stats.done ? stats.acc + "%" : "--";
  }

  function showCurrent() {
    revealed = false;
    $("#idx-label").textContent = "第 " + (idx + 1) + " / " + lines.length + " 句";
    $("#answer-input").value = "";
    var box = $("#answer-box");
    box.textContent = "";
    box.appendChild(core.makeEl(document, "div", "empty", "听完后点「对答案」查看原文（或按 Enter 提交你的听写）"));
    renderList();
    $("#answer-input").focus();
  }

  $("#btn-reveal").addEventListener("click", reveal);
  $("#answer-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); reveal(); }
  });
  function reveal() {
    if (revealed) return;
    revealed = true;
    var cur = lines[idx];
    var box = $("#answer-box");
    box.textContent = "";
    box.appendChild(core.makeEl(document, "div", "answer", cur.text));
    $("#mark-btns").style.display = "";
  }

  /* ---------- 评分（同句改判不重复累计：首次计数，改判做差量调整） ---------- */
  function advance() {
    if (idx < lines.length - 1) idx++;
    $("#mark-btns").style.display = "none";
    showCurrent();
  }
  function mark(status) {
    var prev = lines[idx].status;
    if (prev === status) { advance(); return; }
    lines[idx].status = status;
    if (prev) adjustHistory(prev, status);
    else saveHistory(status);
    advance();
  }
  $("#m-ok").addEventListener("click", function () { mark("ok"); });
  $("#m-close").addEventListener("click", function () { mark("close"); });
  $("#m-miss").addEventListener("click", function () { mark("miss"); });

  $("#btn-prev").addEventListener("click", function () { if (idx > 0) { idx--; $("#mark-btns").style.display = "none"; showCurrent(); } });
  $("#btn-next").addEventListener("click", function () { if (idx < lines.length - 1) { idx++; $("#mark-btns").style.display = "none"; showCurrent(); } });

  /* ---------- 历史统计（localStorage，按本地日期） ---------- */
  function histStore() { try { return JSON.parse(localStorage.getItem("ls7-dictation") || "{}"); } catch (e) { return {}; } }
  function writeHist(store) {
    localStorage.setItem("ls7-dictation", JSON.stringify(store));
    renderHist();
  }
  function saveHistory(status) {
    var store = histStore();
    var k = core.localDateKey();
    var s = store[k] || { ok: 0, close: 0, miss: 0 };
    s[status] = (s[status] || 0) + 1;
    store[k] = s;
    writeHist(store);
  }
  function adjustHistory(prev, next) {
    var store = histStore();
    var k = core.localDateKey();
    var s = store[k] || { ok: 0, close: 0, miss: 0 };
    if (s[prev] > 0) s[prev]--;
    s[next] = (s[next] || 0) + 1;
    store[k] = s;
    writeHist(store);
  }
  function renderHist() {
    var store = histStore();
    var days = Object.keys(store).sort().slice(-7).reverse();
    var box = $("#hist");
    box.textContent = "";
    if (!days.length) {
      box.appendChild(core.makeEl(document, "p", "small", "完成第一句听写后，这里会出现最近 7 天的正确率。"));
      return;
    }
    days.forEach(function (d) {
      var s = store[d];
      var total = (s.ok || 0) + (s.close || 0) + (s.miss || 0);
      var acc = total ? Math.round(((s.ok || 0) + (s.close || 0) * 0.5) / total * 100) : 0;
      var stat = core.makeEl(document, "div", "stat");
      stat.appendChild(core.makeEl(document, "b", null, acc + "%"));
      stat.appendChild(core.makeEl(document, "span", null, d.slice(5) + " · " + total + " 句"));
      box.appendChild(stat);
    });
  }
  renderHist();

  /* ---------- 快捷键 ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.target.matches("textarea,input,select")) return;
    if (e.key === " ") { e.preventDefault(); $("#btn-play").click(); }
    if (e.altKey && e.key.toLowerCase() === "q") { e.preventDefault(); $("#btn-a").click(); }
    if (e.altKey && e.key.toLowerCase() === "w") { e.preventDefault(); $("#btn-b").click(); }
  });
})();
