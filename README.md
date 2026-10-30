# 听力口语 9 分训练营 · IELTS Listen & Speak Lab

一套针对 **雅思 5.5–6.5 → 9（满分）** 的听力 + 口语完整训练系统，纯静态网站，托管于 GitHub Pages。路线分两段：前 90 天抵达 7–8.5（三阶段），此后进入**阶段四 · 9 分冲刺**（以月计的浸泡赛）。

> 仓库名保留 `ielts-listen-speak-7plus`（站点从 7+ 起家，改名会破坏已发布的 Pages 链接），品牌与内容均已升级为 9 分标准。

> **在线访问**：https://tanyaqiongcode.github.io/ielts-listen-speak-7plus/

## 为什么做这个

- 6 → 7 的差距是最"机械化"的一段：**听写**解决"听到写不出"，**精听复盘**解决辨音盲区，**跟读**解决连读吞音，**复述 + 录音自评**解决口语输出。
- 网上资料散落在几百个收藏夹里，本站把方法、素材、开源工具核查整理成一条可执行的路线。
- 内置**听写工作台**（纯前端），把任何音频变成逐句精听材料——与本地 Whisper 转逐字稿工作流无缝衔接。

## 功能

| 页面 | 内容 |
|---|---|
| 首页 | 卡分诊断、每日打卡器（localStorage）、今日素材轮换、分数换算表 |
| 路线图 | 三阶段 90 天计划 + 阶段四（9 分冲刺）、每日 120 分钟模板、每周复盘四问 |
| 水平测试（placement.html） | 3 分钟训练分组定位（纯前端）：词频分级词汇量估算 + 浏览器语音合成盲听 + 口语自评；全项完成度校验后按短板给出起点档。**训练分组参考，非标准化测评** |
| 分档训练 | 5–7 / 7–8 / 8–9 三档独立页面：档位画像、训练处方、每日排片、素材清单、GitHub 工具箱、常见坑、毕业标准；8–9 档含官方满分画像与母语者素材包 |
| 听力训练 | 精听四步法、一句三遍规则、连读弱读清单、王陆语料库用法、五大题型策略、错因分类表 |
| 听写工作台 | 本地音频 + 自备原文逐句听写：AB 循环、变速、错因标记、7 天正确率曲线，全程数据不出本机 |
| 听力素材 | BBC / VOA / CNN 10 / TED / 播客按难度分级 + **每日自动更新的最新节目** |
| 英美剧 | 三档分级剧单（含口音与练法标注）、五步刷剧法、双字幕工具 |
| 口语训练 | 7 分评分标准拆解、影子跟读、复述训练、录音自评清单、Part 1/2/3 策略、AI 与语伴 |
| 资源库 | 经人工核查的 GitHub 开源项目（星数实时刷新）、网站 / App / 书单 / YouTube 频道 |
| 自动化测试与 CI | `tests/` 下 Node + Python 单元测试（恶意输入 XSS 回归、听写统计口径、定档逻辑与完成度校验、RSS 数据合并）；push 触发 CI，**测试通过才部署 Pages** |

`assets/core.js` 是唯一的渲染与统计实现（安全渲染、听写统计、定档逻辑），浏览器与 Node 双端可用，可被其他站点（如高口训练站）直接复用。

## "静态托管 + 动态体验"的架构

不引入后端，动态能力分三层，全部落在 GitHub Pages 上：

1. **客户端交互**：听写工作台、打卡器、今日推荐——纯 JavaScript + localStorage，零依赖。
2. **GitHub Actions 自动更新**：[`scripts/update_feeds.py`](scripts/update_feeds.py) 每天抓取 BBC / CNN 10 官方 RSS，生成 [`data/latest.json`](data/latest.json)，素材页展示"最新节目"（工作流：[.github/workflows/update-feeds.yml](.github/workflows/update-feeds.yml)）。
3. **实时数据**：资源页的 GitHub 星数经 GitHub API 在浏览器端拉取，失败时回退到静态值。

## 本地运行

纯静态站点，无需构建：

```bash
git clone https://github.com/tanyaqiongcode/ielts-listen-speak-7plus.git
cd ielts-listen-speak-7plus
python3 -m http.server 8000
# 打开 http://localhost:8000
```

> 注意：直接双击 index.html（file:// 协议）时 `data/latest.json` 因 CORS 限制无法加载，其余功能正常。

### 跑测试

```bash
node --test                        # Node 单测（含恶意输入 XSS 回归），需 Node 18+
python3 -m unittest discover -s tests -p "test_*.py"
python3 scripts/update_feeds.py    # 本地验证 RSS 抓取与合并
```

CI 在每次 push / PR 时自动执行以上检查（`.github/workflows/test.yml`）；`deploy.yml` 在测试通过后才把站点发布到 Pages。

## 安全设计

- **不可信内容（用户粘贴的原文、RSS 标题/链接）一律以 `textContent` 渲染**，不进入 `innerHTML`；渲染实现集中在 `assets/core.js`，并有恶意输入回归测试锁定。
- 外链协议白名单：仅放行 `http(s)`，`javascript:` / `data:` 等一律降级为纯文本。
- 听写音频与原文只在浏览器本地处理（Object URL + localStorage），不上传任何服务器。
- 运行时零第三方依赖，无供应链面。

## 数据源

RSS 更新脚本仅抓取以下官方公开源（可自行增删 `scripts/update_feeds.py` 中的 `FEEDS` 列表）：

- BBC 6 Minute English（`podcasts.files.bbci.co.uk`）
- BBC Global News Podcast（`downloads.bbc.co.uk`）
- CNN 10（`feeds.megaphone.fm`）

可靠性约定：单个源抓取失败时**沿用上次成功数据**（合并写入，每源带 `fetched_at`）；仅当全部源失败且无历史数据时 CI 才判失败。

## 版权与免责声明

本仓库只包含**方法文章、自研工具与链接导航**，不存储、不分发任何受版权保护的音视频、字幕或剑桥真题文件。所有音视频请通过官方渠道获取（BBC/VOA/CNN 官网与官方播客、正版流媒体、正规渠道购买的剑桥真题）。RSS 抓取仅读取公开元数据（标题与链接），并指向官方页面。

定位测试（placement.html）的结果**仅用于训练分组**（决定从哪个档位页开始练），不构成标准化测评或分数预测。

## License

[MIT](LICENSE)
