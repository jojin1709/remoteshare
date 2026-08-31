# RemoteShare — Free AnyDesk-style Screen Sharing

100% free stack:
- **WebRTC** — peer-to-peer video + control, no paid service
- **Socket.io** — tiny signaling server (just relays connection handshakes, deploy free)
- **Electron** — wraps the host side into a real Windows `.exe`
- **robotjs** — simulates mouse/keyboard on the host so a viewer can remote-control it

```
remote-share/
  server/     -> signaling server (Node + Socket.io)
  client/     -> viewer.html — anyone opens this in a browser to VIEW/control a session
  electron/   -> the HOST app — this is what becomes the .exe
```

Why two different pieces? Browsers won't let a webpage move your mouse or type on
your keyboard (security). So the **host** (the machine being controlled) has to be a
real desktop app — that's the Electron app. The **viewer** (the person watching/controlling)
can just use a normal browser — no install needed for them.

---

## 1. Run the signaling server

```bash
cd server
npm install
npm start
```

Runs on `http://localhost:4000`. This is the ONLY server involved, and it never
sees your screen — it just passes small connection messages between host and viewer
so they can talk directly (peer-to-peer).

### Deploy it for free (so it works over the internet, not just your LAN)
- **Render.com** → New Web Service → connect this `server/` folder → free tier works fine
- **Railway.app** → same idea, free tier
- Once deployed, you'll get a URL like `https://your-app.onrender.com`

Then update `SIGNALING_SERVER_URL` in **both**:
- `client/config.js`
- `electron/config.js`

to that deployed URL instead of `http://localhost:4000`.

---

## 2. Run the host app (the one being shared/controlled)

```bash
cd electron
npm install
npm start
```

This opens a small window: pick which screen to share → click **Start Session** →
you get a 6-digit code. Give that code to whoever needs access.

> **Note on robotjs:** it's a native module, so `npm install` compiles it for your
> Node/Electron version. If it fails to build, screen SHARING still works fine —
> only remote CONTROL (mouse/keyboard) won't. To fix, install build tools:
> ```
> npm install -g windows-build-tools   (or install Visual Studio Build Tools + Python)
> npm install robotjs
> npx electron-rebuild
> ```

---

## 3. Viewer side (the person watching/controlling)

Just open `client/viewer.html` in any browser (double-click it, or serve it with
any static host — Netlify/Vercel/GitHub Pages all work free). Enter the 6-digit
code from the host. Done — they see the screen live, and can tick
**"Enable remote control"** to take over mouse/keyboard.

---

## 4. Build the host app into a Windows `.exe`

```bash
cd electron
npm install
npm run build:win
```

This uses `electron-builder` (free, open source) to produce a portable `.exe` in
`electron/dist/`. Send that single file to anyone — they just double-click it,
no install step, and it works like AnyDesk's host app.

---

## Notes / limitations to know about

- **NAT traversal:** the free STUN server (`stun.l.google.com`) handles most
  home/office networks. If a connection won't establish on stricter corporate
  networks, you'd need a **TURN** server as a relay. Free options: self-host
  `coturn` on a free-tier VPS, or use metered.ca's free TURN tier (50GB/month).
  Add it to the `ICE_SERVERS` array in both `config.js` files.
- **One viewer per session** in this version (keeps it simple/secure). Easy to
  extend to multiple viewers later if you want.
- **Security:** codes are single-use random 6-digit numbers and only live while
  the host is sharing. For anything sensitive, consider adding a password on
  top of the code, or short code expiry — happy to add that if you want.
- This is your own private tool — no telemetry, no ads, no account required.
