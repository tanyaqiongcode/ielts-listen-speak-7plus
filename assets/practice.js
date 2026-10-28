/* 听写工作台：本地音频 + 自备原文，A-B 循环、变速、逐句听写核对（纯前端，数据不出本机） */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
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
    box.innerHTML = "";
    lines.forEach(function (l, i) {
      var icon = l.status === "ok" ? "✅" : l.status === "close" ? "🟡" : l.status === "miss" ? "❌" : "·";
      var div = document.createElement("div");
      div.className = "line" + (i === idx ? " current" : "");
      div.textContent = icon + " " + (i + 1) + ". " + (l.status ? l.text : "……");
      if (i === idx) div.style.fontWeight = "700";
      div.addEventListener("click", function () { idx = i; showCurrent(); });
      box.appendChild(div);
    });
    var done = lines.filter(function (l) { return l.status; }).length;
    var ok = lines.filter(function (l) { return l.status === "ok"; }).length;
    var close = lines.filter(function (l) { return l.status === "close"; }).length;
    $("#progress").textContent = done + " / " + lines.length + " 句";
    $("#acc").textContent = done ? Math.round((ok + close * 0.5) / done * 100) + "%" : "--";
  }

  function showCurrent() {
    revealed = false;
    var cur = lines[idx];
    $("#idx-label").textContent = "第 " + (idx + 1) + " / " + lines.length + " 句";
    $("#answer-input").value = "";
    var box = $("#answer-box");
    box.innerHTML = '<div class="empty">听完后点「对答案」查看原文（或按 Enter 提交你的听写）</div>';
    renderList();
    $("#answer-input").focus();
  }

  $("#btn-reveal").addEventListener("click", reveal);
  $("#answer-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); reveal(); }
  });
  function reveal() {
    revealed = true;
    var cur = lines[idx];
    $("#answer-box").innerHTML = '<div class="answer">' + cur.text + "</div>";
    $("#mark-btns").style.display = "";
  }

  function mark(status) {
    lines[idx].status = status;
    saveHistory(status);
    if (idx < lines.length - 1) { idx++; }
    $("#mark-btns").style.display = "none";
    showCurrent();
  }
  $("#m-ok").addEventListener("click", function () { mark("ok"); });
  $("#m-close").addEventListener("click", function () { mark("close"); });
  $("#m-miss").addEventListener("click", function () { mark("miss"); });

  $("#btn-prev").addEventListener("click", function () { if (idx > 0) { idx--; $("#mark-btns").style.display = "none"; showCurrent(); } });
  $("#btn-next").addEventListener("click", function () { if (idx < lines.length - 1) { idx++; $("#mark-btns").style.display = "none"; showCurrent(); } });

  /* ---------- 历史统计（localStorage） ---------- */
  function histStore() { try { return JSON.parse(localStorage.getItem("ls7-dictation") || "{}"); } catch (e) { return {}; } }
  function saveHistory(status) {
    var store = histStore();
    var k = new Date().toISOString().slice(0, 10);
    var s = store[k] || { ok: 0, close: 0, miss: 0 };
    s[status]++;
    store[k] = s;
    localStorage.setItem("ls7-dictation", JSON.stringify(store));
    renderHist();
  }
  function renderHist() {
    var store = histStore();
    var days = Object.keys(store).sort().slice(-7).reverse();
    var html = "";
    days.forEach(function (d) {
      var s = store[d];
      var total = s.ok + s.close + s.miss;
      var acc = total ? Math.round((s.ok + s.close * 0.5) / total * 100) : 0;
      html += '<div class="stat"><b>' + acc + "%</b><span>" + d.slice(5) + " · " + total + " 句</span></div>";
    });
    $("#hist").innerHTML = html || '<p class="small">完成第一句听写后，这里会出现最近 7 天的正确率。</p>';
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
