# Privacy Policy — RemoteShare

**Last Updated: August 2026**

RemoteShare is built with privacy as a foundational principle.

## 1. Zero Cloud Video Storage
RemoteShare operates exclusively over direct Peer-to-Peer (P2P) WebRTC connections. **No video, desktop frame, mouse movements, or audio data ever pass through or are saved to any cloud storage or servers.**

## 2. Ephemeral Signaling Only
The lightweight signaling server only brokers the initial handshake (session codes, SDP exchange, ICE candidates) to allow the two peers to discover each other. As soon as the direct P2P connection is established, the signaling server has zero visibility into the streaming session.

## 3. No Tracking / Telemetry
- No user tracking or behavioral telemetry.
- No analytics trackers or advertisement scripts.
- No cookies or persistent user identifiers.

## 4. End-to-End Encryption
All streaming data is secured using DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol), encrypted end-to-end between host and viewer.
