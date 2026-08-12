(function () {
  "use strict";

  var currentScript = document.currentScript;
  var cfg = window.ChatbotConfig || {};

  function attr(name, fallback) {
    if (currentScript && currentScript.getAttribute(name) !== null) {
      return currentScript.getAttribute(name);
    }
    return fallback;
  }

  var API_URL = cfg.apiUrl || attr("data-api-url", (currentScript ? new URL(currentScript.src).origin : ""));
  // Valorile de mai jos sunt folosite doar ca fallback instant, cat timp se
  // incarca setarile curente de la server (vezi loadConfigAndMount) - astfel,
  // daca proprietarul schimba numele/culoarea/logo-ul din panoul de admin,
  // widget-ul de pe site le preia automat, fara sa mai fie nevoie sa
  // regenereze si sa re-lipeasca codul de instalare.
  var BOT_NAME = cfg.botName || attr("data-name", "Asistent virtual");
  var ACCENT = cfg.color || attr("data-color", "#2563eb");
  var GREETING = cfg.greeting || attr("data-greeting", "Buna! Cu ce te pot ajuta astazi?");
  var LOGO_URL = cfg.logoUrl || attr("data-logo-url", "");
  var STORAGE_KEY = "site_chatbot_session_id";

  function getSessionId() {
    try {
      var id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch (e) {
      return "sess-" + Math.random().toString(36).slice(2);
    }
  }

  var sessionId = getSessionId();

  var host = document.createElement("div");
  host.id = "site-chatbot-widget-host";

  function loadConfigAndMount() {
    if (document.getElementById("site-chatbot-widget-host")) return;
    if (!API_URL) {
      mount();
      return;
    }
    var done = false;
    var timeoutId = setTimeout(function () {
      if (!done) {
        done = true;
        mount();
      }
    }, 2500);

    fetch(API_URL.replace(/\/$/, "") + "/api/widget-config")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (remote) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        if (remote) {
          if (remote.businessName) BOT_NAME = remote.businessName;
          if (remote.color) ACCENT = remote.color;
          if (remote.greeting) GREETING = remote.greeting;
          if (remote.logoUrl) LOGO_URL = remote.logoUrl;
        }
        mount();
      })
      .catch(function () {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        mount();
      });
  }

  document.addEventListener("DOMContentLoaded", loadConfigAndMount);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    loadConfigAndMount();
  }

  function mount() {
    if (document.getElementById("site-chatbot-widget-host")) return;
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent =
      ':host{all:initial;}' +
      '.scb-launcher{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;' +
      "background:" + ACCENT + ";box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;display:flex;" +
      "align-items:center;justify-content:center;z-index:2147483000;border:none;transition:transform .15s ease;}" +
      ".scb-launcher:hover{transform:scale(1.06);}" +
      ".scb-launcher svg{width:28px;height:28px;fill:#fff;}" +
      ".scb-launcher img{width:100%;height:100%;border-radius:50%;object-fit:cover;}" +
      ".scb-header-logo{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;}" +
      ".scb-header-text{display:flex;align-items:center;gap:10px;}" +
      ".scb-panel{position:fixed;bottom:92px;right:20px;width:360px;max-width:92vw;height:520px;max-height:75vh;" +
      "background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;" +
      "overflow:hidden;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}" +
      ".scb-panel.open{display:flex;}" +
      ".scb-header{background:" + ACCENT + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;}" +
      ".scb-header strong{font-size:15px;}" +
      ".scb-header span{font-size:12px;opacity:.85;display:block;}" +
      ".scb-close{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:4px;}" +
      ".scb-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f7f8fa;}" +
      ".scb-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;}" +
      ".scb-msg.bot{background:#fff;color:#111;border:1px solid #e5e7eb;align-self:flex-start;border-bottom-left-radius:4px;}" +
      ".scb-msg.user{background:" + ACCENT + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}" +
      ".scb-msg.typing{color:#888;font-style:italic;}" +
      ".scb-inputbar{display:flex;border-top:1px solid #e5e7eb;padding:10px;gap:8px;background:#fff;}" +
      ".scb-inputbar textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:10px;padding:9px 10px;" +
      "font-size:14px;font-family:inherit;max-height:80px;outline:none;}" +
      ".scb-inputbar textarea:focus{border-color:" + ACCENT + ";}" +
      ".scb-send{background:" + ACCENT + ";border:none;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px;}" +
      ".scb-send:disabled{opacity:.5;cursor:default;}" +
      ".scb-footer{text-align:center;font-size:10px;color:#9ca3af;padding:4px 0 8px;}";
    shadow.appendChild(style);

    var SVG_ICON =
      '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.6 1.23 4.94 3.2 6.6L4 22l4.66-1.53C9.7 20.8 10.83 21 12 21c5.52 0 10-4.02 10-9s-4.48-10-10-10z"/></svg>';

    var launcher = document.createElement("button");
    launcher.className = "scb-launcher";
    launcher.setAttribute("aria-label", "Deschide chat");
    if (LOGO_URL) {
      var launcherImg = document.createElement("img");
      launcherImg.src = LOGO_URL;
      launcherImg.alt = "";
      launcherImg.addEventListener("error", function () {
        launcher.innerHTML = SVG_ICON;
      });
      launcher.appendChild(launcherImg);
    } else {
      launcher.innerHTML = SVG_ICON;
    }
    shadow.appendChild(launcher);

    var panel = document.createElement("div");
    panel.className = "scb-panel";
    panel.innerHTML =
      '<div class="scb-header">' +
      '<div class="scb-header-text">' +
      (LOGO_URL ? '<img class="scb-header-logo" src="' + escapeAttr(LOGO_URL) + "\" alt=\"\" onerror=\"this.style.display='none'\" />" : "") +
      "<div><strong>" + escapeHtml(BOT_NAME) + '</strong><span>online</span></div>' +
      "</div>" +
      '<button class="scb-close" aria-label="Inchide">&times;</button>' +
      "</div>" +
      '<div class="scb-messages"></div>' +
      '<div class="scb-inputbar">' +
      '<textarea rows="1" placeholder="Scrie un mesaj..."></textarea>' +
      '<button class="scb-send">Trimite</button>' +
      "</div>" +
      '<div class="scb-footer">Raspunsurile pot fi generate automat.</div>';
    shadow.appendChild(panel);

    var messagesEl = panel.querySelector(".scb-messages");
    var textarea = panel.querySelector("textarea");
    var sendBtn = panel.querySelector(".scb-send");
    var closeBtn = panel.querySelector(".scb-close");

    var greeted = false;

    launcher.addEventListener("click", function () {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        textarea.focus();
        if (!greeted) {
          greeted = true;
          addMessage("bot", GREETING);
        }
      }
    });
    closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
    });

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function escapeAttr(str) {
      return String(str).replace(/"/g, "&quot;");
    }

    function addMessage(role, text) {
      var el = document.createElement("div");
      el.className = "scb-msg " + role;
      el.textContent = text;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    }

    function autoGrow() {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 80) + "px";
    }
    textarea.addEventListener("input", autoGrow);
    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    sendBtn.addEventListener("click", send);

    var sending = false;
    function send() {
      var text = textarea.value.trim();
      if (!text || sending) return;
      addMessage("user", text);
      textarea.value = "";
      autoGrow();
      sending = true;
      sendBtn.disabled = true;

      var typingEl = addMessage("bot typing", "Scrie...");

      fetch(API_URL.replace(/\/$/, "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || "Eroare server");
            return data;
          });
        })
        .then(function (data) {
          typingEl.remove();
          addMessage("bot", data.reply || "Ne pare rau, nu am putut genera un raspuns.");
        })
        .catch(function (err) {
          typingEl.remove();
          addMessage("bot", "A aparut o eroare de conexiune. Te rugam sa incerci din nou. (" + err.message + ")");
        })
        .finally(function () {
          sending = false;
          sendBtn.disabled = false;
        });
    }
  }
})();
