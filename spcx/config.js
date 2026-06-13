// SPCX dashboard config — points at the deployed Cloudflare Worker (holds the
// API keys as secrets; no keys live in this page). Source + deploy guide:
// https://github.com/martingluckman/spcx-monitor/blob/main/web/DEPLOY.md
// Override at runtime with ?api=<url>.
window.SPCX_API = "https://spcx-monitor-api.martin-84d.workers.dev";
