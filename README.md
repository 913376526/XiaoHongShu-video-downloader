# RED Video Downloader

**A lightweight Chrome extension for saving videos from Xiaohongshu (RedNote).**

一个轻量、简洁的小红书视频下载 Chrome 扩展。

**English** | [中文说明](#中文说明)

---

## Overview

RED Video Downloader is an independent Chrome extension built with Manifest V3 and vanilla JavaScript.

It was created to explore a simple idea: can I build a small tool that makes it easier to save videos while browsing Xiaohongshu, without having to open developer tools or use a separate downloading website?

The extension aims to provide a straightforward workflow: open a supported video note, click the extension icon, and save the video using Chrome's native download functionality.

This is an experimental personal project developed with AI-assisted coding. It is not affiliated with Xiaohongshu or RedNote.

## Features

- **One-click workflow** — Access the download action directly from the browser toolbar.
- **Video detection** — Identify video resources on supported Xiaohongshu video-note pages.
- **Native download integration** — Use Chrome's download capabilities and Save As dialog.
- **Lightweight implementation** — Built with vanilla JavaScript and Chrome Manifest V3, without external runtime dependencies.
- **Minimal interface** — Focused on a simple, practical user experience.

> **Project status:** Early prototype (P1). Static checks have passed, but compatibility and actual video downloads still require manual testing in Chrome.

## Installation

The extension is currently intended for local installation in developer mode.

1. Download or clone this repository.
2. Open Google Chrome.
3. Navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the upper-right corner.
5. Click **Load unpacked**.
6. Select the `extension/` folder from this repository.
7. Pin RED Video Downloader to your Chrome toolbar for easier access.

## How to Use

1. Open Xiaohongshu in Chrome.
2. Navigate to a supported video-note page.
3. Click the RED Video Downloader icon in your browser toolbar.
4. Follow the extension's download action.
5. If the download is available, choose where to save the video using Chrome's native dialog.

Actual behavior may vary depending on the page structure, video availability, and browser permissions.

## Tech Stack

| Technology | Purpose |
|---|---|
| JavaScript | Extension logic |
| HTML / CSS | Popup interface |
| Chrome Manifest V3 | Browser extension architecture |
| Chrome Extension APIs | Browser interaction and downloading |
| Node.js | Local static checks |
| AI-assisted development | Prototyping, implementation, and review |

## Project Structure

```text
red-video-downloader/
├── extension/           # Chrome extension source code
│   ├── manifest.json
│   ├── README.md
│   └── tools/           # Local validation script
├── docs/                # Product and development documentation
├── reference/           # Links to referenced projects
├── TECHNICAL.md         # Technical notes
├── README.md            # Project overview
└── .gitignore
```

## Development & Validation

The project follows a lightweight, iterative development process:

1. Define the problem and minimum viable feature.
2. Research existing solutions and Chrome extension capabilities.
3. Build a small working prototype with AI-assisted coding.
4. Review implementation details and security considerations.
5. Validate the behavior and iterate.

**Current validation status:**

- Static validation: 39 checks passed.
- Manifest and JavaScript syntax checks: passed.
- Real-browser installation and download tests: not yet fully verified.

The current implementation should be treated as an experimental prototype rather than a production-ready extension.

## Known Limitations

- Supports only the page patterns currently recognized by the implementation.
- Changes to Xiaohongshu's website or media delivery may affect functionality.
- Videos that require additional authorization or are unavailable to the current user may not be downloadable.
- Not yet validated across different Chrome versions and operating systems.
- Not published to the Chrome Web Store.

## Roadmap

- [x] Build the initial Chrome MV3 extension
- [x] Implement the basic popup and download workflow
- [x] Complete initial static validation
- [ ] Complete browser-based functional testing
- [ ] Improve error messages and download-state feedback
- [ ] Add screenshots and a short usage demo
- [ ] Improve compatibility with supported video-note pages
- [ ] Refine the extension interface

## Acknowledgements

The following open-source projects were consulted during technical research:

- [JoeanAmier/XHS-Downloader](https://github.com/JoeanAmier/XHS-Downloader)
- [fanwx12345/xiaoHongShu-Downloader](https://github.com/fanwx12345/xiaoHongShu-Downloader)

Their public documentation and implementation approaches provided useful technical references.

This repository contains an independently developed Chrome extension. No source code from the referenced GPL-3.0 projects is intentionally redistributed in this repository.

## Responsible Use

This project is intended for personal learning, technical experimentation, and downloading content that users are authorized to access and save.

Please respect content creators' rights, applicable laws, and platform terms of service. Do not use this extension to access restricted content or redistribute copyrighted videos without permission.

## License

A license has not yet been selected. Unless otherwise stated, all rights to the original project code are reserved.

---

# 中文说明

## 项目简介

**RED 视频下载助手**是一款基于 Chrome Manifest V3 开发的小红书视频下载浏览器扩展。

这个项目源于一个很简单的想法：

平时浏览小红书时，如果想保存某个视频，往往需要借助第三方下载网站，或者打开浏览器开发者工具寻找视频资源。能不能为自己做一个更直接、更方便的小工具？

于是，我尝试使用 AI 辅助编程，从需求分析、技术调研到插件开发，完成了这个轻量级的浏览器扩展原型。

希望实现的体验很简单：

**打开视频笔记 → 点击浏览器插件 → 保存视频。**

这是一个个人学习与实验项目，与小红书官方无关。

## 核心功能

- **快捷下载**：通过浏览器工具栏直接发起视频保存操作。
- **视频识别**：识别已支持的小红书视频笔记页面中的视频资源。
- **原生保存**：结合 Chrome 下载能力和系统另存为窗口保存文件。
- **轻量实现**：使用原生 JavaScript 和 Chrome MV3，无额外运行时依赖。
- **简洁交互**：尽量减少操作步骤，让工具保持简单实用。

> **当前状态：** P1 最小验证版。已通过 39 项本地静态检查，尚未完整完成 Chrome 浏览器中的实际下载测试。

## 安装方法

目前支持通过 Chrome 开发者模式在本地安装：

1. 下载或克隆本项目。
2. 打开 Google Chrome 浏览器。
3. 在地址栏输入 `chrome://extensions/`。
4. 打开右上角的「开发者模式」。
5. 点击「加载已解压的扩展程序」。
6. 选择项目中的 `extension/` 文件夹。
7. 安装后，可将插件固定到 Chrome 工具栏。

## 使用方法

1. 在 Chrome 中打开小红书网页版。
2. 进入插件支持的视频笔记页面。
3. 点击浏览器工具栏中的 RED 视频下载助手。
4. 按照插件界面提示发起下载。
5. 如果资源可用，在 Chrome 弹出的保存窗口中选择保存位置。

实际效果可能受到页面结构、视频资源状态和浏览器权限等因素影响。

## 技术实现

| 技术 | 用途 |
|---|---|
| JavaScript | 核心逻辑 |
| HTML / CSS | 插件交互界面 |
| Chrome Manifest V3 | 浏览器扩展架构 |
| Chrome Extension APIs | 浏览器交互与下载 |
| Node.js | 本地静态检查 |
| AI 辅助编程 | 原型开发、代码实现与审查 |

## 开发过程

这个项目也是我进行 Vibe Coding 的一次实践。

主要经历了几个阶段：

1. **发现需求**：从自己使用小红书的实际场景中寻找可以改进的体验。
2. **调研方案**：研究现有下载工具与 Chrome 扩展的技术能力。
3. **定义功能**：优先完成最小可用功能，避免一开始就加入过多复杂设计。
4. **AI 辅助开发**：使用 AI 编程工具协助实现插件逻辑与交互。
5. **检查与验证**：通过静态检查、代码审查和后续实机测试不断改进。

除了最终的代码，我也希望通过这个项目记录自己如何借助 AI，把一个日常想法逐步实现为能够使用的软件工具。

## 当前限制

- 仅识别当前实现所支持的页面类型。
- 小红书网页结构或视频资源获取方式发生变化时，插件可能失效。
- 不保证可以下载需要额外授权或当前用户无权访问的内容。
- 尚未完成所有浏览器版本和操作系统的兼容性测试。
- 暂未上架 Chrome 应用商店。

## 开源参考与致谢

项目开发过程中，参考了以下开源项目的技术思路及公开资料：

- [JoeanAmier/XHS-Downloader](https://github.com/JoeanAmier/XHS-Downloader)
- [fanwx12345/xiaoHongShu-Downloader](https://github.com/fanwx12345/xiaoHongShu-Downloader)

感谢相关作者分享的技术资料与开源成果。

本仓库中的浏览器扩展由我独立开发，未有意复制或分发上述 GPL-3.0 项目的源代码。

## 使用说明与免责声明

本项目仅用于个人学习、技术研究及保存用户有权访问和下载的内容。

使用时请尊重内容创作者的权益、相关法律法规及平台服务条款。请勿利用本工具访问受限制的资源，或未经许可传播他人的版权内容。

## 开源协议

目前尚未选择具体开源许可证。除另有说明外，本项目原创代码保留全部权利。