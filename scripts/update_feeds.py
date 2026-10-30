#!/usr/bin/env python3
"""抓取公开播客 RSS，生成 data/latest.json 供 materials.html 展示。

数据可靠性约定：
- 单个源失败时，沿用上次成功抓取的该源数据（合并写入，绝不因部分失败丢弃好数据）；
- 仅当「全部源失败且无历史数据」时才以非零码退出（CI 视为失败）；
- 每个源带 fetched_at，前端可见数据新旧。
仅在 GitHub Actions 定时任务与手动触发时运行。"""
import json
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEEDS = [
    {
        "id": "bbc-6me",
        "name": "BBC 6 Minute English",
        "url": "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
    },
    {
        "id": "bbc-globalnews",
        "name": "BBC Global News Podcast",
        "url": "https://downloads.bbc.co.uk/podcasts/worldservice/globalnews/rss.xml",
    },
    {
        "id": "cnn10",
        "name": "CNN 10",
        "url": "https://feeds.megaphone.fm/WMHY2232473209",
    },
]

HEADERS = {"User-Agent": "ielts-listen-speak-7plus/1.0 (feed updater)"}
MAX_ITEMS = 8


def fetch_feed(feed):
    req = urllib.request.Request(feed["url"], headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        if not title:
            continue
        enclosure = item.find("enclosure")
        if enclosure is not None and link == "":
            link = enclosure.get("url", "")
        items.append({
            "title": title,
            "link": link,
            "date": (item.findtext("pubDate") or "").strip(),
            "audio": enclosure.get("url", "") if enclosure is not None else "",
        })
        if len(items) >= MAX_ITEMS:
            break
    return items


def merge_with_previous(previous, fresh):
    """合并本轮抓取结果与上次成功数据。

    fresh 每项: {id, name, url, ok, fetched_at, items}
    previous  : 上一次的 latest.json（可为 None）
    失败源沿用 previous 中同 id 的整条记录；无历史则 items 置空。
    纯函数，便于单元测试。"""
    prev_map = {f.get("id"): f for f in (previous or {}).get("feeds", [])}
    merged = []
    for f in fresh:
        if f["ok"]:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": f["items"], "fetched_at": f["fetched_at"],
            })
        elif f["id"] in prev_map:
            keep = dict(prev_map[f["id"]])
            keep.setdefault("fetched_at", None)
            merged.append(keep)
        else:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": [], "fetched_at": None,
            })
    return merged


def load_previous(dest):
    if not dest.exists():
        return None
    try:
        return json.loads(dest.read_text(encoding="utf-8"))
    except Exception:
        return None


def main():
    dest = Path(__file__).resolve().parent.parent / "data" / "latest.json"
    previous = load_previous(dest)
    now = datetime.now(timezone.utc).isoformat()

    fresh, ok_count = [], 0
    for feed in FEEDS:
        entry = {"id": feed["id"], "name": feed["name"], "url": feed["url"],
                 "ok": False, "fetched_at": now, "items": []}
        try:
            entry["items"] = fetch_feed(feed)
            entry["ok"] = True
            ok_count += 1
            print(f"OK   {feed['name']}")
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {feed['name']}: {exc}", file=sys.stderr)
        fresh.append(entry)

    out = {"updated": now, "feeds": merge_with_previous(previous, fresh)}
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {dest} ({ok_count}/{len(FEEDS)} feeds fresh)")
    if ok_count == 0 and not (previous and previous.get("feeds")):
        sys.exit(1)


if __name__ == "__main__":
    main()
