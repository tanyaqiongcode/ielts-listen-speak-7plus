/* 通用脚本：导航高亮 / 每日打卡 / 今日推荐 / 资源星数 / 最新素材 */
(function () {
  "use strict";

  /* ---------- 导航高亮 ---------- */
  var page = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".topbar nav a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === page) a.classList.add("active");
  });

  /* ---------- 每日打卡（localStorage） ---------- */
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  var checkin = document.querySelector("[data-checkin]");
  if (checkin) {
    var items = checkin.querySelectorAll("input[type=checkbox]");
    var store = {};
    try { store = JSON.parse(localStorage.getItem("ls7-checkin") || "{}"); } catch (e) {}
    var dateEl = checkin.querySelector(".date");
    if (dateEl) {
      var wd = "日一二三四五六"[new Date().getDay()];
      dateEl.textContent = "今天是 " + todayKey() + " 星期" + wd;
    }
    // 连续打卡天数
    var streak = 0;
    (function countStreak() {
      var d = new Date(), done = 0;
      while (true) {
        var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        var rec = store[k];
        if (rec && rec.filter(Boolean).length >= 3) { streak++; d.setDate(d.getDate() - 1); } else break;
        if (streak > 3650) break;
      }
    })();
    var streakEl = checkin.querySelector(".streak");
    if (streakEl) streakEl.textContent = "🔥 连续 " + streak + " 天";

    items.forEach(function (cb, i) {
      var rec = store[todayKey()] || [];
      cb.checked = !!rec[i];
      cb.addEventListener("change", function () {
        var rec2 = store[todayKey()] || new Array(items.length).fill(false);
        rec2[i] = cb.checked;
        store[todayKey()] = rec2;
        localStorage.setItem("ls7-checkin", JSON.stringify(store));
        location.reload();
      });
    });
  }

  /* ---------- 今日推荐（按日期轮换） ---------- */
  var daily = document.querySelector("[data-daily]");
  if (daily) {
    var pool = JSON.parse(daily.getAttribute("data-daily"));
    var dayIndex = Math.floor(Date.now() / 86400000);
    var pick = pool[dayIndex % pool.length];
    daily.querySelector(".emoji").textContent = pick.emoji;
    daily.querySelector("b").textContent = pick.title;
    daily.querySelector("p").textContent = pick.desc;
    var link = daily.querySelector("a");
    if (link) link.href = pick.href;
  }

  /* ---------- 资源页：实时星数 ---------- */
  var starEls = document.querySelectorAll("[data-stars]");
  if (starEls.length) {
    starEls.forEach(function (el) {
      var repo = el.getAttribute("data-stars");
      fetch("https://api.github.com/repos/" + repo)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && typeof j.stargazers_count === "number") {
            el.textContent = "★ " + j.stargazers_count.toLocaleString();
            if (j.pushed_at) el.title = "最近推送：" + j.pushed_at.slice(0, 10);
          }
        })
        .catch(function () {});
    });
  }

  /* ---------- 素材页：最新更新（由 GitHub Actions 每日抓取） ---------- */
  var feeds = document.querySelector("[data-feeds]");
  if (feeds) {
    fetch("data/latest.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.feeds) return;
        var html = "";
        j.feeds.forEach(function (f) {
          if (!f.items || !f.items.length) return;
          html += '<div class="card"><h3>' + f.name + "</h3>";
          html += '<ul style="padding-left:20px;margin:8px 0 0">';
          f.items.slice(0, 6).forEach(function (it) {
            html += '<li><a href="' + it.link + '" target="_blank" rel="noopener">' + it.title + "</a>";
            if (it.date) html += '<span class="feed-date">' + it.date.slice(0, 10) + "</span>";
            html += "</li>";
          });
          html += "</ul></div>";
        });
        if (html) {
          feeds.innerHTML = '<div class="grid c3">' + html + "</div>" +
            '<p class="small" style="text-align:center;margin-top:8px">由 GitHub Actions 每日自动更新 · 抓取于 ' + (j.updated || "").slice(0, 10) + "</p>";
        }
      })
      .catch(function () {});
  }
})();
