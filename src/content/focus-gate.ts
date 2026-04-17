/// <reference types="chrome" />

// Content script injected at document_start on all URLs.
// Asks the background worker whether a focus session is active and whether
// this hostname is on the soft-block list. If yes, overlays the page with
// a gentle "Are you sure?" gate — dismissible by the user.

interface CheckReply {
  active: boolean;
  endsAt?: number;
  sites: string[];
}

const KEY = "moment:bypassed";

function hostnameMatches(hostname: string, sites: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return sites.some((raw) => {
    const s = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    return host === s || host.endsWith(`.${s}`);
  });
}

async function run() {
  if (window.top !== window) return;
  const alreadyBypassed = sessionStorage.getItem(KEY) === "1";
  if (alreadyBypassed) return;

  let reply: CheckReply | null = null;
  try {
    reply = await chrome.runtime.sendMessage({ type: "focus-check" });
  } catch {
    return;
  }
  if (!reply?.active) return;
  if (!hostnameMatches(location.hostname, reply.sites)) return;

  showGate(reply.endsAt);
}

function showGate(endsAt?: number) {
  const shadowHost = document.createElement("div");
  shadowHost.id = "moment-focus-gate-host";
  shadowHost.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647;
    display: block;
  `;
  const root = shadowHost.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    .wrap {
      position: fixed; inset: 0;
      background: radial-gradient(ellipse at center, rgba(15,18,25,0.96) 0%, rgba(8,10,15,0.99) 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif;
      color: rgba(255,255,255,0.92);
      animation: fade 400ms ease-out both;
    }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    .card {
      max-width: 560px; width: calc(100% - 48px);
      text-align: center;
      padding: 48px 40px;
      animation: up 500ms cubic-bezier(0.22,1,0.36,1) both;
    }
    @keyframes up {
      from { opacity: 0; transform: translateY(8px) }
      to { opacity: 1; transform: translateY(0) }
    }
    .eyebrow {
      letter-spacing: 0.24em; text-transform: uppercase;
      font-size: 11px; color: rgba(255,255,255,0.45);
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 12px; font-weight: 300; font-size: 40px; letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 32px; font-size: 16px; color: rgba(255,255,255,0.6); line-height: 1.55;
    }
    .host {
      color: rgba(255,255,255,0.85); font-weight: 500;
    }
    .timer {
      display: inline-flex; align-items: center; gap: 8px;
      margin: 0 0 32px;
      padding: 6px 14px; border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 13px; color: rgba(255,255,255,0.7);
      font-variant-numeric: tabular-nums;
    }
    .dot { width: 6px; height: 6px; border-radius: 999px; background: #4ade80; box-shadow: 0 0 8px #4ade80; }
    .actions {
      display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
    }
    button {
      font: inherit; cursor: pointer;
      padding: 12px 22px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.9);
      transition: background 150ms ease, border-color 150ms ease, transform 100ms ease;
    }
    button:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.24); }
    button:active { transform: scale(0.98); }
    button.primary {
      background: rgba(255,255,255,0.92); color: #111; border-color: transparent;
    }
    button.primary:hover { background: #fff; }
  `;
  root.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const host = location.hostname.replace(/^www\./, "");
  const endLabel = endsAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(endsAt)
    : null;

  wrap.innerHTML = `
    <div class="card">
      <div class="eyebrow">Focus mode</div>
      <h1>Are you sure?</h1>
      <p>You chose to stay away from <span class="host">${host}</span> during this session.</p>
      ${endLabel ? `<div class="timer"><span class="dot"></span>Focus ends at ${endLabel}</div>` : ""}
      <div class="actions">
        <button id="moment-back" class="primary">Go back</button>
        <button id="moment-pass">Let me through</button>
      </div>
    </div>
  `;
  root.appendChild(wrap);

  const back = root.getElementById("moment-back");
  const pass = root.getElementById("moment-pass");
  back?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "chrome://newtab";
  });
  pass?.addEventListener("click", () => {
    sessionStorage.setItem(KEY, "1");
    shadowHost.remove();
  });

  const attach = () => {
    (document.body || document.documentElement).appendChild(shadowHost);
  };
  if (document.body) attach();
  else document.addEventListener("DOMContentLoaded", attach, { once: true });
}

run();
