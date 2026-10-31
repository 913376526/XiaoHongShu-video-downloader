/**
 * RED 视频下载助手 - P1 最小验证版 popup 逻辑
 *
 * 数据路径依据工程 TECHNICAL.md（P0 审查结论）：
 *   window.__INITIAL_STATE__.note.noteDetailMap[noteId].note
 *   视频直链优先 note.video.consumer.originVideoKey，回退 video.media.stream。
 * 本实现为原创代码，未复制任何 GPL 参考项目的函数体。
 */

"use strict";

const NOTE_URL_RE = /^https?:\/\/www\.xiaohongshu\.com\/(?:explore|discovery\/item)\/([^/?#]+)/;

const els = {
  title: document.getElementById("video-title"),
  size: document.getElementById("video-size"),
  status: document.getElementById("status"),
  button: document.getElementById("download-btn"),
};

/** 当前标签页识别结果 */
let current = null; // { tabId, noteId, title, videoUrl, sizeBytes }
/** 当前弹出窗口所处的阶段 */
let phase = "detecting"; // detecting | ready | downloading | done | canceled | failed
/** 最近一次触发的下载任务 id（用于状态回查） */
let downloadId = null;

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = kind === "error" ? "status-error" : kind === "ok" ? "status-ok" : "status-info";
}

function setButton(label, enabled) {
  els.button.textContent = label;
  els.button.disabled = !enabled;
}

function showVideoInfo(title, sizeText) {
  if (title) {
    els.title.textContent = title;
    els.title.hidden = false;
  } else {
    els.title.hidden = true;
  }
  if (sizeText) {
    els.size.textContent = sizeText;
    els.size.hidden = false;
  } else {
    els.size.hidden = true;
  }
}

/** 清理标题为合法文件名（规则参考 PRODUCT.md 3.5，原创实现） */
function safeFilename(title, fallback) {
  const name = String(title || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");
  if (!name || name === "." || name === "..") {
    return `${fallback || "red-video"}.mp4`;
  }
  return `${name}.mp4`;
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "大小未知";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `约 ${mb.toFixed(1)} MB`;
  return `约 ${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * 注入页面主世界（MAIN world）执行的提取函数。
 * 必须自包含：不能引用本文件的其他变量。
 * @returns {{ok: boolean, reason?: string, type?: string, title?: string,
 *            noteId?: string, videoUrl?: string, sizeBytes?: number|null}}
 */
function pageExtractNote(noteId) {
  try {
    const state = window.__INITIAL_STATE__;
    if (!state) return { ok: false, reason: "no-initial-state" };

    const map = state.note && state.note.noteDetailMap;
    let note = null;
    if (map) {
      if (noteId && map[noteId] && map[noteId].note) {
        note = map[noteId].note;
      } else {
        const items = Object.values(map);
        if (items.length > 0) note = items[items.length - 1].note || null;
      }
    }
    if (!note && state.noteData && state.noteData.data && state.noteData.data.noteData) {
      note = state.noteData.data.noteData;
    }
    if (!note) return { ok: false, reason: "no-note" };

    const type = typeof note.type === "string" ? note.type : "";
    const title = typeof note.title === "string" && note.title ? note.title
      : typeof note.displayTitle === "string" ? note.displayTitle : "";
    const resolvedNoteId = (typeof note.noteId === "string" && note.noteId)
      || (typeof note.id === "string" ? note.id : noteId || "");

    let videoUrl = "";
    let sizeBytes = null;

    const video = note.video;
    if (video) {
      const originKey = video.consumer && video.consumer.originVideoKey;
      if (typeof originKey === "string" && originKey) {
        videoUrl = `https://sns-video-bd.xhscdn.com/${originKey}`;
      } else if (video.media && video.media.stream) {
        const streams = Object.values(video.media.stream)
          .flat()
          .filter((s) => s && s);
        streams.sort((a, b) => (Number(b.height) || 0) - (Number(a.height) || 0));
        if (streams.length > 0) {
          const best = streams[0];
          videoUrl = (best.backupUrls && best.backupUrls[0]) || best.masterUrl || "";
        }
      }
      if (!sizeBytes && video.media && video.media.stream) {
        const streams = Object.values(video.media.stream)
          .flat()
          .filter(Boolean);
        streams.sort((a, b) => (Number(b.height) || 0) - (Number(a.height) || 0));
        if (streams.length > 0 && Number(streams[0].size) > 0) {
          sizeBytes = Number(streams[0].size);
        }
      }
    }

    return { ok: true, type, title, noteId: resolvedNoteId, videoUrl, sizeBytes };
  } catch (error) {
    return { ok: false, reason: "exception: " + (error && error.message ? error.message : String(error)) };
  }
}

function enterNotVideoPage() {
  phase = "not-video";
  current = null;
  showVideoInfo("", "");
  setStatus("此页面没有可下载的内容～", "info");
  setButton("下载", false);
}

function enterParseFailed(reason) {
  phase = "parse-failed";
  current = null;
  showVideoInfo("", "");
  console.warn("[RED] 解析失败:", reason);
  setStatus("暂时无法识别这个视频。可尝试刷新页面后重新打开插件重试。", "error");
  setButton("重试检测", true);
}

function enterReady(info) {
  phase = "ready";
  current = info;
  showVideoInfo(
    info.title || `视频 ${info.noteId}`,
    info.sizeBytes ? formatSize(info.sizeBytes) : "大小未知"
  );
  setStatus("识别成功，可下载当前视频。", "ok");
  setButton(`下载`, true);
}

function detect() {
  phase = "detecting";
  showVideoInfo("", "");
  setStatus("检测中…", "info");
  setButton("下载", false);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) {
      enterNotVideoPage();
      return;
    }
    const match = tab.url.match(NOTE_URL_RE);
    if (!match) {
      enterNotVideoPage();
      return;
    }
    const noteId = match[1];

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        world: "MAIN",
        func: pageExtractNote,
        args: [noteId],
      },
      (results) => {
        if (chrome.runtime.lastError) {
          enterParseFailed(chrome.runtime.lastError.message);
          return;
        }
        const result = results && results[0] && results[0].result;
        if (!result || result.ok !== true) {
          enterParseFailed(result && result.reason ? result.reason : "empty-result");
          return;
        }
        if (result.type !== "video" || !result.videoUrl) {
          // 图文页或数据里没有可用视频资源：与"非视频页"同样按无可下载内容处理
          enterNotVideoPage();
          return;
        }
        enterReady({
          tabId: tab.id,
          noteId: result.noteId || noteId,
          title: result.title,
          videoUrl: result.videoUrl,
          sizeBytes: result.sizeBytes,
        });
      }
    );
  });
}

function mapDownloadState(item) {
  if (!item) return null;
  if (item.state === "complete") return { phase: "done", text: "下载完成。", kind: "ok" };
  if (item.state === "in_progress") return { phase: "downloading", text: "下载中…", kind: "info" };
  if (item.state === "interrupted") {
    if (item.error === "USER_CANCELED" || item.error === "CANCELLED") {
      return { phase: "canceled", text: "已取消保存，可再次点击下载。", kind: "info" };
    }
    return { phase: "failed", text: `下载失败（${item.error || "未知错误"}），可重试。`, kind: "error" };
  }
  return null;
}

function applyDownloadState(item) {
  const mapped = mapDownloadState(item);
  if (!mapped) return;
  phase = mapped.phase;
  setStatus(mapped.text, mapped.kind);
  if (phase === "downloading") {
    setButton("下载中…", false);
  } else {
    setButton("重新下载", true);
  }
}

/** 打开 Popup 时与浏览器真实下载状态对齐（PRODUCT.md 5 / A13） */
function syncLastDownload() {
  chrome.storage.session.get("lastDownload", (data) => {
    const record = data && data.lastDownload;
    if (!record || typeof record.id !== "number") return;
    chrome.downloads.search({ id: record.id }, (items) => {
      if (!items || items.length === 0) return;
      downloadId = record.id;
      applyDownloadState(items[0]);
    });
  });
}

function startDownload() {
  if (phase !== "ready" && phase !== "done" && phase !== "canceled" && phase !== "failed") return;
  if (!current || !current.videoUrl) return;

  const filename = safeFilename(current.title, current.noteId);
  phase = "downloading";
  setStatus("下载中…", "info");
  setButton("下载中…", false);

  chrome.downloads.download(
    {
      url: current.videoUrl,
      filename: filename,
      saveAs: true,
    },
    (id) => {
      if (chrome.runtime.lastError) {
        phase = "failed";
        setStatus(`下载启动失败（${chrome.runtime.lastError.message}），可重试。`, "error");
        setButton("重试下载", true);
        return;
      }
      if (typeof id !== "number") {
        phase = "failed";
        setStatus("下载启动失败，可重试。", "error");
        setButton("重试下载", true);
        return;
      }
      downloadId = id;
      chrome.storage.session.set({
        lastDownload: { id: id, startedAt: Date.now() },
      });
    }
  );
}

chrome.downloads.onChanged.addListener((delta) => {
  if (typeof downloadId !== "number" || delta.id !== downloadId) return;
  if (delta.state) {
    chrome.downloads.search({ id: delta.id }, (items) => {
      if (items && items[0]) applyDownloadState(items[0]);
    });
  }
});

els.button.addEventListener("click", () => {
  if (phase === "parse-failed") {
    detect();
    return;
  }
  startDownload();
});

detect();
syncLastDownload();
