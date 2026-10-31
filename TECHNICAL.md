# P0 技术审查报告

状态：已完成（基于本地参考源码静态审查；未做实机验证，所有实机项均已标注）。
参考代码位置：本工程 `reference/` 目录（只读）。

- 项目 A：JoeanAmier/XHS-Downloader @ commit `2ab2620b0dd35b04530e70f1e9c7ab3f78c5d6c5`（2026-10-18），LICENSE = GPL-3.0。用户脚本版本 2.4.4。
- 项目 B：fanwx12345/xiaoHongShu-Downloader @ commit `ecd6eddbdaac943466cede39cae9b73d4476ca8b`（2026-08-26），LICENSE = GPL-3.0。

## 1. 结论先行

**最短技术路径存在，且不需要 Python、不需要 GM_*、不需要 Cookie 处理：**

1. Popup/Service Worker 判断当前标签页 URL 是否为 `xiaohongshu.com/explore/{noteId}` 或 `/discovery/item/{noteId}`（视频作品页）。
2. 通过 `chrome.scripting.executeScript({ world: "MAIN" })` 在页面主世界读取 `window.__INITIAL_STATE__.note.noteDetailMap[noteId].note`，取得 `note.type`、`note.title/displayTitle`、`note.video.consumer.originVideoKey`。
3. 拼接直链 `https://sns-video-bd.xhscdn.com/{originVideoKey}`，调用 `chrome.downloads.download({ url, filename, saveAs: true })` 弹出原生另存为对话框。

项目 A 的用户脚本已验证了第 2、3 步的浏览器端可行性（无需本地服务）；MV3 的 `chrome.downloads` 替代其 `blob + a[download]` 触发方式，同时天然满足"原生另存为"需求。

## 2. 关键源码证据 [源码确认]

### 项目 A：用户脚本 `static/XHS-Downloader.js`（3496 行）

| 功能 | 位置 | 内容 |
|---|---|---|
| 页面匹配 | L19–L26 `@match` | `explore*`、`discovery/item/*`、`user/profile/*`、`search_result*` 等 |
| 页面识别 | L901 `extractCurrentNoteId` | 从 URL `/explore/{id}`、`/discovery/item/{id}` 提取 noteId |
| 数据源 | L734 `extractNoteInfo` | `unsafeWindow.__INITIAL_STATE__` → `noteData.data.noteData` 或 `note.noteDetailMap[noteId].note` |
| 类型判断 | L695、L931 `classifyNoteType` | `note.type === "video"` |
| 视频直链 | L603 `generateVideoUrl` | 优先 `note.video.consumer.originVideoKey` → `https://sns-video-bd.xhscdn.com/{key}`；回退 `note.video.media.stream` 各清晰度按 height 排序取 `backupUrls[0] || masterUrl` |
| 标题 | L954 | `note.title || note.displayTitle || noteId` |
| 文件名清理 | L879 `filterFileName` | 非法字符替换为空格、去首尾空白与末尾点、排除 `.`/`..`/Windows 保留名 |
| 下载 | L790 `downloadFile` → L1044 `downloadVideo` | 页面上下文 `fetch(link, { headers: {accept, accept-language}, referrerPolicy: "no-referrer" })` → `blob` → L770 `triggerDownload`（`a[download].click()`），失败重试 5 次；**无 Referer、无 Cookie、无签名参数** |
| 服务器模式 | L368、L425–426、L677 `download` | 可选 WebSocket 推送到本地 Python 服务（默认 `ws://127.0.0.1:5558`，默认关闭）；**纯浏览器路径默认即可用** |
| GM_* 用途 | L23–28、L358–543 | 仅 `GM_getValue/GM_setValue`（设置持久化）、`GM_registerMenuCommand`（菜单）、`unsafeWindow`（读页面状态）、`GM_setClipboard`；**下载本身不依赖任何 GM API** |
| 文件大小 | 全文无 `Content-Length` 处理 | 用户脚本不读取文件大小 |
| 运行环境 | L37 `@run-at document-end`、`@require` jszip | jszip 仅用于图文打包，视频路径不需要 |

Python 端对照（`source/application/video.py`，与用户脚本逻辑一致）：L8–L12 `originVideoKey` 优先；L44 `case "size"` 按 `items.sort(key=lambda x: x.size)` 排序——**说明 API 的 `video.media.stream.*[*]` 数据中带有 `size` 字段**（文件大小的第一候选来源）。

### 项目 B：`xiaoHongShu-Downloader`

- 是 XHS-Downloader 的精简衍生版本：`source/application/video.py` 与项目 A 同文件逻辑逐行一致（originVideoKey → 直链、stream 回退）。
- 形态：本机 Web 服务（监听 `127.0.0.1`），用户在网页粘贴作品链接，Python 后端（httpx）完成 API 请求与下载；Cookie 为可选配置项（`source/module/settings.py` L16），用于"更完整的数据和更高质量的视频"（README）。
- 对插件开发的增量信息有限；其价值是产品负责人人工观察"下载结果无水印"的载体。**两仓库源码中均无"水印/watermark"字样，无水印表现未在代码层得到解释。**

## 3. 可直接复用 vs 需重写

**可直接迁移（思路与数据结构，非逐字代码）：**
- 页面识别正则 `/\/(?:explore|discovery\/item)\/([^/?#]+)/`。
- note 数据读取路径：`__INITIAL_STATE__.note.noteDetailMap[noteId].note`（及 `noteData.data.noteData` 备选）。
- 视频直链构造：`originVideoKey` 优先、stream 回退（含按 height 排序）。
- 标题字段选择与文件名非法字符清理规则。
- 下载请求特征：标准 accept 头 + `no-referrer`，无额外鉴权。

**需重写/替换：**
- `unsafeWindow` → MV3 content script `"world": "MAIN"`（Chrome 111+）或 `chrome.scripting.executeScript({world: "MAIN"})`。ISOLATED 世界读不到 `__INITIAL_STATE__`，这是迁移的核心差异点。
- `fetch + blob + a.click()` → `chrome.downloads.download({ saveAs: true })`。避免整段视频读入内存，且天然获得原生另存为对话框、真实下载事件与断点续传。
- GM_setValue 菜单体系 → 不需要（v1.0 无设置项）。
- jszip 依赖 → 不需要（不做图文打包）。

**明确不需要：** Python/curl_cffi（`source/application/request.py` L3 的 TLS 指纹伪装仅服务于脚本外直连 API 的场景）；扩展内所有请求都发生在小红书页面上下文或携带宿主权限的 Service Worker 中，浏览器自带登录态与指纹。

## 4. Cookie / 网络 / 权限依赖

- **Cookie：无需读取或保存。** `__INITIAL_STATE__` 是页面服务端渲染结果，天然携带当前用户的会话上下文；用户脚本即以此工作。扩展不接触 Cookie 即可满足 PRODUCT.md 的安全要求（未登录状态下数据是否完整 → 待验证，见 §7）。
- **网络：** 唯一外联是 `sns-video-bd.xhscdn.com`。manifest 需 `host_permissions` 或依赖页面上下文 fetch。用户脚本以 `referrerPolicy: "no-referrer"` 成功下载 [源码确认]；CDN 是否返回允许跨域的 CORS 头未实测（若在 MAIN 世界 fetch blob 则与脚本环境完全一致；若走 `chrome.downloads` 直链则完全不需要 CORS）。
- **权限（最小集）：** `downloads`（saveAs 下载）、`activeTab` + `scripting`（点击 Popup 时注入 MAIN 世界脚本读取状态）、`host_permissions: ["https://www.xiaohongshu.com/*"]`（content script 注册/脚本注入目标）。不需要 `cookies`、`webRequest`、`tabs` 全量权限（可用 `chrome.tabs.query({active, currentWindow})` 配合 activeTab 获取 URL，待 P1 验证 URL 可见性）。

## 5. 文件大小方案

1. **首选 [待验证]**：`note.video.media.stream.{h264,h265,...}[n].size` 字段（Python 端按其排序，证明字段存在）。注意 originVideoKey 直链的大小可能与最高码流 stream 的 size 不完全一致，展示时以"约"或所选清晰度为准。
2. **次选 [待验证]**：对直链发 `HEAD`（或带 Range 的 GET）读 `Content-Length`。
3. **回退**：显示"大小未知"，不阻塞下载（PRODUCT.md §3.3、A07 已覆盖）。

## 6. 许可证与平台风险

- **GPL-3.0**：两仓库均为 GPL-3.0。**禁止逐字复制其 JS/Python 代码**（含 `generateVideoUrl`、`filterFileName` 等函数体），否则整个扩展必须以 GPL-3.0 发布并保留版权声明。本报告仅提取 URL 格式、JSON 字段路径、请求头等**事实性信息**（不受版权保护），实现应全部原创编写。`reference/` 不进入扩展工程 Git 历史。
- **商标/署名**：不得暗示小红书官方授权（PRODUCT.md 已约束）。
- **平台风险 [待验证]**：CDN 直链可能有时效（过期需重新读取页面状态）；未登录或风控状态下 `__INITIAL_STATE__` 可能缺少视频数据；`originVideoKey` 缺失时回退 stream 是必需路径。无水印表现无法从代码保证，须按 A17 逐样本记录。
- **行为边界**：v1.0 不实现自动遍历、频率规避；下载仅由用户点击触发，与两参考项目的合规设计一致。

## 7. 最小验证方案（P1 前置实验）

| # | 实验 | 方法 | 判定 |
|---|---|---|---|
| E1 | 页面数据结构 | 在授权视频页 DevTools Console 读取 `__INITIAL_STATE__.note.noteDetailMap`，核对 `note.type/title/video.consumer.originVideoKey` 及 `media.stream.*.size` | 字段存在即通过 |
| E2 | 直链有效性 | Console 执行 `fetch(url, {referrerPolicy:"no-referrer"})`，确认 200 且可读 blob；对比 `Content-Length` 与 stream.size | 直链可下载即通过 |
| E3 | MAIN 世界注入 | 临时扩展用 `chrome.scripting.executeScript({world:"MAIN"})` 读取 `__INITIAL_STATE__` | 能取到 note 数据即通过 |
| E4 | 原生另存为 | 临时扩展对直链调用 `chrome.downloads.download({saveAs:true})`，测试取消/完成/Popup 关闭不中断 | 事件与 A09/A10/A13 一致即通过 |
| E5 | 未登录场景 | 未登录状态重复 E1 | 记录数据完整性差异（风险项，不阻塞） |

## 8. 推荐架构（P1 最小扩展）

```
manifest.json (MV3)
├─ action.popup  → popup.js/popup.html
│    1. chrome.tabs.query 取活动标签页 URL
│    2. 匹配 /explore/{id}|/discovery/item/{id}；不匹配 → "此页面没有可下载的内容～"
│    3. chrome.scripting.executeScript({target:{tabId}, world:"MAIN", func:extractNote})
│       extractNote 返回 {type, title, videoUrl, sizeBytes?}（原创实现 §2 数据路径）
│    4. type==="video" → 显示标题/大小 + 下载按钮；否则按图文/失败分支提示
│    5. 点击下载 → chrome.downloads.download({url, filename: 清理后标题+".mp4", saveAs:true})
│    6. chrome.downloads.onChanged/onDeterminingFilename 维持状态真实（P3）
└─ permissions: downloads, activeTab, scripting; host: www.xiaohongshu.com
```

## 9. 待解决问题清单

1. `stream.size` 与 originVideoKey 直链实际大小是否一致（E1/E2）。
2. CDN 直链时效与 CORS 表现；`chrome.downloads` 直链下载是否受防盗链影响（E2/E4）。
3. 未登录/风控下 `__INITIAL_STATE__` 完整性（E5）。
4. `activeTab` 下 Popup 能否稳定拿到完整 URL（含跳转 SPA 路由变化后的刷新时机）。
5. 无水印表现的复验方法与样本记录（A17，属 P4 实测）。
6. Popup 关闭后 `chrome.downloads` 任务存续与状态恢复（E4）。
