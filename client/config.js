window.SIGNALING_SERVER_URL = "https://remoteshare-ykpm.onrender.com";

// Free public STUN server (no account needed). Good enough for most home/office networks.
// If two peers are behind strict NAT/firewalls, you may need a free TURN server too —
// see README.md for how to add one (e.g. self-hosted coturn, or metered.ca's free tier).
window.ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
