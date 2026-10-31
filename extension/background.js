/**
 * RED 视频下载助手 - service worker
 *
 * 仅做一件事：监听真实 Chrome 下载事件，把最近一次下载的状态写入
 * chrome.storage.session，供 Popup 打开时同步真实状态（不自行提示成功）。
 */

"use strict";

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state) return;
  const record = {
    id: delta.id,
    state: delta.state.current, // in_progress | interrupted | complete
    error: delta.error ? delta.error.current : null,
    at: Date.now(),
  };
  chrome.storage.session.set({ lastDownload: record });
});
