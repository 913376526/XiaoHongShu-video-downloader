#!/usr/bin/env node
/**
 * P1 本地自动代码检查：
 *  1. manifest.json 可解析且包含 MV3 必需字段；
 *  2. 所有 JS/HTML 文件存在且 JS 语法有效（node --check）；
 *  3. popup.js 不引用 GPL 参考项目的禁止依赖（GM_*、WebSocket 服务等）；
 *  4. 验证关键需求点对应的代码特征存在。
 * 用法：node tools/check.js（在 extension/ 目录下运行）
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const failures = [];

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures.push(name);
}

// 1. manifest
const manifestPath = path.join(root, "manifest.json");
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  check("manifest.json 可解析", true);
} catch (e) {
  check("manifest.json 可解析", false, e.message);
  process.exit(1);
}

check("manifest_version === 3", manifest.manifest_version === 3);
check("permissions 含 downloads/activeTab/scripting", ["downloads", "activeTab", "scripting", "storage"].every((p) => (manifest.permissions || []).includes(p)));
check("action.default_popup 存在", manifest.action && manifest.action.default_popup === "popup.html");
check("service_worker 已声明", manifest.background && manifest.background.service_worker === "background.js");
check("host_permissions 仅限小红书域", JSON.stringify(manifest.host_permissions) === JSON.stringify(["https://www.xiaohongshu.com/*"]));

// 2. 文件存在 + JS 语法
for (const f of ["popup.html", "popup.js", "background.js", "manifest.json"]) {
  check(`文件存在: ${f}`, fs.existsSync(path.join(root, f)));
}
for (const f of ["popup.js", "background.js"]) {
  try {
    execFileSync(process.execPath, ["--check", path.join(root, f)], { stdio: "pipe" });
    check(`语法检查: ${f}`, true);
  } catch (e) {
    check(`语法检查: ${f}`, false, String(e.stderr || e.message));
  }
}

// 3. 禁止依赖（不得引入 GM_*、WebSocket、Python 服务调用、批量采集）
for (const f of ["popup.js", "background.js"]) {
  const code = fs.readFileSync(path.join(root, f), "utf8");
  for (const banned of ["GM_", "GM_setValue", "GM_getValue", "WebSocket", "127.0.0.1", "eval(", "new Function"]) {
    check(`${f} 不包含禁止依赖 ${banned}`, !code.includes(banned));
  }
}

// 4. 需求特征
const popup = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const bg = fs.readFileSync(path.join(root, "background.js"), "utf8");
const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");

check("使用 MAIN world 注入", popup.includes('"world": "MAIN"') || popup.includes("world: \"MAIN\"") || popup.includes('world: "MAIN"'));
check("读取 __INITIAL_STATE__", popup.includes("__INITIAL_STATE__"));
check("originVideoKey 直链路径", popup.includes("originVideoKey") && popup.includes("sns-video-bd.xhscdn.com"));
check("stream 回退路径", popup.includes("media.stream") || popup.includes("media && video.media.stream"));
check("saveAs: true 原生另存为", popup.includes("saveAs: true"));
check("chrome.downloads.download 触发", popup.includes("chrome.downloads.download"));
check("真实下载事件同步（onChanged）", popup.includes("chrome.downloads.onChanged") && bg.includes("chrome.downloads.onChanged"));
check("区分取消与失败（USER_CANCELED）", popup.includes("USER_CANCELED"));
check("非视频页提示文案", html.includes("此页面没有可下载的内容～") || popup.includes("此页面没有可下载的内容～"));
check("解析失败提示文案", popup.includes("暂时无法识别这个视频"));
check("大小未知回退", popup.includes("大小未知"));
check("仅用户点击触发下载（无自动下载定时器）", !popup.includes("setInterval") && !popup.includes("setTimeout(.*download"));
check("无图片下载逻辑（imageList 不触发保存）", !popup.includes("downloadImage"));

console.log("");
if (failures.length > 0) {
  console.error(`共 ${failures.length} 项未通过`);
  process.exit(1);
}
console.log("全部检查通过 ✓");
