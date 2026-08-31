> [!NOTE]
> **[RemoteShare v1.0.0 is officially released!](https://github.com/jojin1709/remoteshare/releases/tag/v1.0.0)** — High-performance, 100% free AnyDesk & TeamViewer alternative powered by WebRTC.

<div align="center">

# ⚡ RemoteShare
### Ultra-Fast, Free & Private Peer-to-Peer Screen Sharing

[![Download Windows Installer](https://img.shields.io/badge/Download-Windows%20Setup%20(Installer)-2563EB?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Setup-v1.0.0-Windows.exe)
[![Download Portable Version](https://img.shields.io/badge/Download-Portable%20.exe-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Portable-v1.0.0-Windows.exe)
[![Live Web Viewer](https://img.shields.io/badge/Live-Web%20Viewer-00C7B7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://remoteshare-ykpm.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br />

**RemoteShare is a lightweight, zero-cost screen sharing solution designed for instant desktop-to-browser streaming without accounts, subscriptions, or telemetry.**

---

<a href="https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Setup-v1.0.0-Windows.exe"><img src="https://img.shields.io/badge/📥_Download_Windows_Installer_(Setup.exe)-2563EB?style=for-the-badge" height="40" alt="Download Windows Installer"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Portable-v1.0.0-Windows.exe"><img src="https://img.shields.io/badge/📦_Download_Portable_.exe-0078D6?style=for-the-badge" height="40" alt="Download Portable"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://remoteshare-ykpm.onrender.com/"><img src="https://img.shields.io/badge/🌐_Open_Web_Viewer-1F6FEB?style=for-the-badge" height="40" alt="Open Web Viewer"></a>

---

</div>

> [!TIP]
> **Zero Installation for Viewers:** The viewer runs directly in any modern web browser (Chrome, Edge, Firefox, Safari, Mobile). No software or browser extensions are required to watch a shared screen.

## Table of Contents

- [What is RemoteShare?](#what-is-remote-share)
- [Quick Start](#quick-start)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Security and Privacy](#security-and-privacy)
- [About the Developer](#about-the-developer)
- [Common Questions](#common-questions)

---

## What is RemoteShare?

**RemoteShare** is an autonomous peer-to-peer screen streaming platform built by **Jojin John**. It delivers sub-second latency screen sharing by establishing direct WebRTC connections between the host computer and any web viewer worldwide.

Unlike proprietary tools like AnyDesk or TeamViewer that enforce subscription limits and route video through central servers, RemoteShare transfers all encrypted video data directly device-to-device.

### Why RemoteShare?

- **No Subscriptions or Time Limits:** Completely free with no commercial popups or session timers.
- **Direct P2P Streaming:** Video frames flow directly between host and viewer via WebRTC.
- **Instant Access:** Share a 6-digit session code, and the remote viewer connects in seconds.

---

## Quick Start

### For Host (Sharing Your Screen)

1. Download the Windows Installer or Portable binary:
   - 📥 [**Download Windows Setup (Installer)**](https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Setup-v1.0.0-Windows.exe) *(Adds Desktop & Start Menu shortcuts)*
   - 📦 [**Download Portable .exe**](https://github.com/jojin1709/remoteshare/releases/latest/download/RemoteShare-Portable-v1.0.0-Windows.exe) *(Runs anywhere, no install required)*
2. Launch RemoteShare (enjoy the fast animated splash screen).
3. Select your screen and click **Start Session**.
4. Click **Copy Share Link** or share your 6-digit code.

### For Viewer (Watching the Screen)

1. Open the live web viewer in any browser:
   👉 [**https://remoteshare-ykpm.onrender.com/**](https://remoteshare-ykpm.onrender.com/)
2. Enter the **6-digit code** provided by the host.
3. Click **Connect** to start viewing the live stream instantly.

---

## Key Capabilities

- **Direct WebRTC P2P Pipeline:** High-framerate, ultra-low latency desktop streaming.
- **Standalone Portable Binary:** Single `.exe` file that runs instantly without external dependencies.
- **Universal Browser Compatibility:** Works across Windows, macOS, Linux, Android, and iOS browsers.
- **Dynamic NAT Traversal:** Integrated public STUN servers for seamless connectivity across standard home and office networks.
- **Privacy-Centric:** No video or screen data ever touches or gets stored on intermediate servers.

---

## Architecture

RemoteShare uses a decoupled, lightweight signaling topology:

```text
  ┌────────────────────────┐                   ┌────────────────────────┐
  │   Host Desktop App     │                   │   Web Browser Viewer   │
  │ (RemoteShare.exe)      │                   │ (Chrome / Safari / etc)│
  └───────────┬────────────┘                   └───────────┬────────────┘
              │                                            │
              │  1. Session handshake (Socket.io)          │
              ├───────────────────┬────────────────────────┤
              │                   │                        │
              │                   ▼                        │
              │        ┌──────────────────────┐            │
              │        │   Signaling Server   │            │
              │        │  (Render Cloud P2P)  │            │
              │        └──────────────────────┘            │
              │                                            │
              │  2. Direct WebRTC P2P Video Stream         │
              └────────────────────────────────────────────┘
```

1. **Signaling:** The lightweight signaling server pairs the host and viewer using single-use 6-digit codes.
2. **Direct P2P Link:** Once paired, the two devices establish a direct WebRTC stream. Video and audio go directly between devices.

---

## Security and Privacy

- **Zero-Knowledge Signaling:** The signaling server only brokers the connection; it never sees, buffers, or records your video stream.
- **Ephemeral Session Codes:** Random 6-digit codes exist only while the session is active and expire immediately upon disconnect.
- **End-to-End Encryption:** WebRTC peer-to-peer data channels and media tracks are encrypted by default using standard DTLS/SRTP encryption.

---

## About the Developer

<div align="center">

**Developed with ❤️ by [JOJIN JOHN](https://github.com/jojin1709)**

*Software Engineer · Cybersecurity Enthusiast · Full Stack Developer*

[![GitHub: jojin1709](https://img.shields.io/badge/GitHub-jojin1709-181717?style=for-the-badge&logo=github)](https://github.com/jojin1709)

</div>

---

## Common Questions

### Does the person viewing my screen need to install anything?
No. The viewer only needs a standard web browser (Chrome, Edge, Safari, Firefox) and the 6-digit code.

### Is there any time limit on sharing?
No. Sessions can run continuously for as long as you keep the host application open.

### Are my screen streams saved on any server?
No. All screen captures are streamed peer-to-peer over encrypted WebRTC channels and are never stored anywhere.

<br />

<p align="center">
  <b>Developed by <a href="https://github.com/jojin1709">JOJIN JOHN</a></b>
</p>
