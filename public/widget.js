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
  // Culoarea e fixa (brand Veronik) pe toate instantele - nu mai e
  // personalizabila din panoul de admin. Ramane totusi suprascriabila direct
  // din codul de instalare (data-color), ca eventuala exceptie tehnica, nu ca
  // optiune oferita clientului.
  var ACCENT = cfg.color || attr("data-color", "#3D5AFE");
  // Valorile de mai jos sunt folosite doar ca fallback instant, cat timp se
  // incarca setarile curente de la server (vezi loadConfigAndMount) - astfel,
  // daca proprietarul schimba numele/logo-ul/pozitia din panoul de admin,
  // widget-ul de pe site le preia automat, fara sa mai fie nevoie sa
  // regenereze si sa re-lipeasca codul de instalare.
  var BOT_NAME = cfg.botName || attr("data-name", "Asistent virtual");
  var GREETING = cfg.greeting || attr("data-greeting", "Buna! Cu ce te pot ajuta astazi?");
  var LOGO_URL = cfg.logoUrl || attr("data-logo-url", "");
  var POSITION = cfg.position || attr("data-position", "right"); // "right" sau "left"
  var PRIVACY_URL = cfg.privacyPolicyUrl || attr("data-privacy-url", "");
  var CONTACT_PHONE = cfg.contactPhone || "";
  var CONTACT_WHATSAPP = cfg.contactWhatsapp || "";
  var CONTACT_EMAIL = cfg.contactEmail || "";
  var CONTACT_ADDRESS = cfg.contactAddress || "";
  var CONTACT_URL = cfg.contactUrl || "";
  var LANGUAGE = cfg.language || attr("data-language", "romana");
  var STORAGE_KEY = "site_chatbot_session_id";
  var HISTORY_KEY = "site_chatbot_history";
  var CONSENT_KEY = "site_chatbot_ai_consent";
  var MAX_STORED_TURNS = 40; // 20 schimburi user+assistant

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

  // Istoricul conversatiei se pastreaza in browser-ul vizitatorului, nu pe
  // server - astfel conversatia ramane vizibila si dupa un refresh de pagina,
  // si contextul supravietuieste chiar daca serverul reporneste intre timp.
  function loadStoredHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_STORED_TURNS)));
    } catch (e) {
      // localStorage indisponibil (mod privat etc.) - conversatia ramane doar in pagina curenta
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
          if (remote.greeting) GREETING = remote.greeting;
          if (remote.logoUrl) LOGO_URL = remote.logoUrl;
          if (remote.position === "left" || remote.position === "right") POSITION = remote.position;
          if (remote.language) LANGUAGE = remote.language;
          if (remote.privacyPolicyUrl) PRIVACY_URL = remote.privacyPolicyUrl;
          if (remote.contactPhone) CONTACT_PHONE = remote.contactPhone;
          if (remote.contactWhatsapp) CONTACT_WHATSAPP = remote.contactWhatsapp;
          if (remote.contactEmail) CONTACT_EMAIL = remote.contactEmail;
          if (remote.contactAddress) CONTACT_ADDRESS = remote.contactAddress;
          if (remote.contactUrl) CONTACT_URL = remote.contactUrl;
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

    var SIDE = POSITION === "left" ? "left" : "right";

    var style = document.createElement("style");
    style.textContent =
      ':host{all:initial;}' +
      '.scb-launcher{position:fixed;bottom:20px;' + SIDE + ':20px;width:60px;height:60px;border-radius:50%;' +
      "background:" + ACCENT + ";box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;display:flex;" +
      "align-items:center;justify-content:center;z-index:2147483000;border:none;transition:transform .15s ease;}" +
      ".scb-launcher:hover{transform:scale(1.06);}" +
      ".scb-launcher svg{width:28px;height:28px;fill:#fff;position:relative;z-index:1;}" +
      ".scb-launcher-ring{position:absolute;inset:0;border-radius:50%;background:" + ACCENT + ";" +
      "animation:scbPulse 2.6s ease-out infinite;}" +
      "@keyframes scbPulse{0%{transform:scale(1);opacity:.55;}70%{transform:scale(1.55);opacity:0;}100%{transform:scale(1.55);opacity:0;}}" +
      "@media (prefers-reduced-motion: reduce){.scb-launcher-ring{animation:none;display:none;}}" +
      ".scb-header-logo{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;}" +
      ".scb-header-text{display:flex;align-items:center;gap:10px;}" +
      ".scb-panel{position:fixed;bottom:92px;" + SIDE + ":20px;width:360px;max-width:92vw;height:520px;max-height:75vh;" +
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
      ".scb-msg.bot a{color:" + ACCENT + ";text-decoration:underline;font-weight:600;}" +
      ".scb-inputbar{display:flex;border-top:1px solid #e5e7eb;padding:10px;gap:8px;background:#fff;}" +
      ".scb-inputbar textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:10px;padding:9px 10px;" +
      "font-size:14px;font-family:inherit;max-height:80px;outline:none;}" +
      ".scb-inputbar textarea:focus{border-color:" + ACCENT + ";}" +
      ".scb-mic{background:transparent;border:1px solid #d1d5db;color:#6b7280;border-radius:10px;width:38px;" +
      "min-width:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;}" +
      ".scb-mic.recording{background:#ef4444;border-color:#ef4444;color:#fff;animation:scbMicPulse 1.1s ease-in-out infinite;}" +
      "@keyframes scbMicPulse{0%,100%{opacity:1;}50%{opacity:.55;}}" +
      ".scb-send{background:" + ACCENT + ";border:none;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px;}" +
      ".scb-send:disabled{opacity:.5;cursor:default;}" +
      ".scb-footer{text-align:center;font-size:10px;color:#9ca3af;padding:4px 0 8px;}" +
      ".scb-footer a{color:#9ca3af;text-decoration:none;font-weight:600;}" +
      ".scb-footer a:hover{color:" + ACCENT + ";text-decoration:underline;}" +
      ".scb-cards{display:flex;flex-direction:column;gap:8px;align-self:flex-start;max-width:82%;margin-top:-2px;}" +
      ".scb-card{display:flex;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px;align-items:center;}" +
      ".scb-card-img{width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#f3f4f6;}" +
      ".scb-card-body{display:flex;flex-direction:column;gap:4px;min-width:0;}" +
      ".scb-card-title{font-size:12.5px;font-weight:600;color:#111;line-height:1.3;overflow:hidden;" +
      "text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}" +
      ".scb-card-cta{font-size:12px;font-weight:700;color:" + ACCENT + ";text-decoration:none;}" +
      ".scb-card-cta:hover{text-decoration:underline;}" +
      ".scb-overlay{position:absolute;inset:0;background:rgba(17,24,39,.94);color:#fff;display:none;" +
      "flex-direction:column;padding:26px 22px;overflow-y:auto;z-index:2;}" +
      ".scb-overlay.open{display:flex;}" +
      ".scb-overlay-close{position:absolute;top:12px;right:14px;background:transparent;border:none;color:#9ca3af;" +
      "font-size:20px;cursor:pointer;line-height:1;padding:4px;}" +
      ".scb-overlay-icon{width:52px;height:52px;border-radius:14px;background:" + ACCENT + ";display:flex;" +
      "align-items:center;justify-content:center;margin:6px auto 16px;}" +
      ".scb-overlay-icon svg{width:26px;height:26px;fill:#fff;}" +
      ".scb-overlay h3{margin:0 0 14px;font-size:16px;text-align:center;}" +
      ".scb-overlay p{margin:0 0 12px;font-size:12.5px;line-height:1.55;color:#d1d5db;text-align:center;}" +
      ".scb-overlay a{color:#93c5fd;}" +
      ".scb-overlay-actions{display:flex;gap:10px;margin-top:auto;padding-top:14px;}" +
      ".scb-overlay-actions button{flex:1;border-radius:10px;padding:11px 8px;font-size:13px;font-weight:700;" +
      "cursor:pointer;border:none;}" +
      ".scb-decline{background:#374151;color:#e5e7eb;}" +
      ".scb-accept{background:" + ACCENT + ";color:#fff;}" +
      ".scb-contact-list{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;margin:6px 0 14px;}" +
      ".scb-contact-row{display:flex;justify-content:space-between;gap:10px;padding:11px 14px;font-size:12.5px;" +
      "border-bottom:1px solid rgba(255,255,255,.1);}" +
      ".scb-contact-row:last-child{border-bottom:none;}" +
      ".scb-contact-row span:first-child{color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;font-size:10.5px;}" +
      ".scb-contact-row a{color:#fff;text-decoration:none;font-weight:600;}" +
      ".scb-contact-row a:hover{text-decoration:underline;}" +
      ".scb-close-wide{background:" + ACCENT + ";color:#fff;border:none;border-radius:10px;padding:11px;" +
      "font-size:13px;font-weight:700;cursor:pointer;margin-top:auto;}" +
      // Pe telefon, panoul deschis ocupa tot ecranul (nu mai ramane bula
      // vizibila dedesubt) - experienta obisnuita pentru chat pe mobil.
      "@media (max-width:480px){.scb-panel{left:0;right:0;top:0;bottom:0;width:100%;height:100%;" +
      "max-width:100%;max-height:100%;border-radius:0;}}";
    shadow.appendChild(style);

    var SVG_ICON =
      '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.6 1.23 4.94 3.2 6.6L4 22l4.66-1.53C9.7 20.8 10.83 21 12 21c5.52 0 10-4.02 10-9s-4.48-10-10-10z"/></svg>';

    // Bula flotanta foloseste mereu iconita predefinita (nu logo-ul clientului) -
    // usor de recunoscut pe orice site, indiferent de brandul clientului. Logo-ul
    // clientului apare doar in antetul panoului, langa numele afacerii.
    var launcher = document.createElement("button");
    launcher.className = "scb-launcher";
    launcher.setAttribute("aria-label", "Deschide chat");
    launcher.innerHTML = '<span class="scb-launcher-ring"></span>' + SVG_ICON;
    shadow.appendChild(launcher);

    var MIC_ICON =
      '<svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';

    var contactRows = "";
    if (CONTACT_PHONE) contactRows += '<div class="scb-contact-row"><span>Telefon</span><a href="tel:' + escapeAttr(CONTACT_PHONE.replace(/\s+/g, "")) + '">' + escapeHtml(CONTACT_PHONE) + "</a></div>";
    if (CONTACT_WHATSAPP) contactRows += '<div class="scb-contact-row"><span>WhatsApp</span><a href="https://wa.me/' + escapeAttr(CONTACT_WHATSAPP.replace(/[^\d]/g, "")) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(CONTACT_WHATSAPP) + "</a></div>";
    if (CONTACT_EMAIL) contactRows += '<div class="scb-contact-row"><span>Email</span><a href="mailto:' + escapeAttr(CONTACT_EMAIL) + '">' + escapeHtml(CONTACT_EMAIL) + "</a></div>";
    if (CONTACT_ADDRESS) contactRows += '<div class="scb-contact-row"><span>Adresa</span><span>' + escapeHtml(CONTACT_ADDRESS) + "</span></div>";
    if (CONTACT_URL) contactRows += '<div class="scb-contact-row"><span>Contact</span><a href="' + escapeAttr(CONTACT_URL) + '" target="_blank" rel="noopener noreferrer">Deschide</a></div>';

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
      '<div class="scb-footer">Raspunsurile pot fi generate automat. &middot; <a href="https://veronik.ro" target="_blank" rel="noopener">Powered by Veronik</a></div>' +
      '<div class="scb-overlay scb-consent-overlay">' +
      '<button class="scb-overlay-close" aria-label="Inchide">&times;</button>' +
      '<div class="scb-overlay-icon">' + SVG_ICON + "</div>" +
      "<h3>Discuti cu o inteligenta artificiala</h3>" +
      "<p>Raspunsurile sunt generate automat si pot contine inexactitati. Mesajele tale sunt procesate de servicii AI partenere, pentru a genera raspunsuri relevante.</p>" +
      "<p>Te rugam sa nu introduci date sensibile (CNP, parole, informatii bancare) decat daca este necesar.</p>" +
      "<p>Conversatiile sunt pastrate conform politicii de confidentialitate" + (PRIVACY_URL ? ", disponibila <a href=\"" + escapeAttr(PRIVACY_URL) + "\" target=\"_blank\" rel=\"noopener noreferrer\">aici</a>" : "") + ". Tehnologie oferita de <a href=\"https://veronik.ro\" target=\"_blank\" rel=\"noopener noreferrer\">Veronik</a>.</p>" +
      '<div class="scb-overlay-actions">' +
      '<button class="scb-decline">Nu sunt de acord</button>' +
      '<button class="scb-accept">Sunt de acord, continua</button>' +
      "</div>" +
      "</div>" +
      '<div class="scb-overlay scb-contact-overlay">' +
      '<button class="scb-overlay-close" aria-label="Inchide">&times;</button>' +
      '<div class="scb-overlay-icon">' + SVG_ICON + "</div>" +
      "<h3>Cum te putem ajuta altfel</h3>" +
      (contactRows
        ? "<p>Intelegem. Pentru orice intrebare, ne poti contacta direct:</p>" + '<div class="scb-contact-list">' + contactRows + "</div>"
        : "<p>Intelegem. Ne poti contacta direct prin datele de pe acest site, sau revino oricand sa discuti cu asistentul nostru.</p>") +
      '<button class="scb-close-wide">Inchide</button>' +
      "</div>";
    shadow.appendChild(panel);

    var messagesEl = panel.querySelector(".scb-messages");
    var textarea = panel.querySelector("textarea");
    var sendBtn = panel.querySelector(".scb-send");
    var closeBtn = panel.querySelector(".scb-close");
    var consentOverlay = panel.querySelector(".scb-consent-overlay");
    var contactOverlay = panel.querySelector(".scb-contact-overlay");

    var conversation = loadStoredHistory(); // [{role:'user'|'assistant', content:text}]
    var greeted = false;
    if (conversation.length) {
      greeted = true;
      conversation.forEach(function (turn) {
        addMessage(turn.role === "user" ? "user" : "bot", turn.content);
      });
      // vizitatori care au discutat deja inainte sa existe acest ecran nu
      // trebuie blocati retroactiv cu un consimtamant pe care nu l-au vazut
      if (!hasConsent()) setConsent();
    }

    function hasConsent() {
      try {
        return localStorage.getItem(CONSENT_KEY) === "accepted";
      } catch (e) {
        return true; // localStorage indisponibil - nu blocam conversatia
      }
    }
    function setConsent() {
      try {
        localStorage.setItem(CONSENT_KEY, "accepted");
      } catch (e) {}
    }

    function openChat() {
      textarea.focus();
      if (!greeted) {
        greeted = true;
        addMessage("bot", GREETING);
      }
    }

    function closeOverlays() {
      consentOverlay.classList.remove("open");
      contactOverlay.classList.remove("open");
    }

    // Bula flotanta ramane ascunsa cat timp panoul e deschis - pe mobil
    // panoul ocupa tot ecranul, deci bula n-ar mai avea ce sa faca acolo,
    // iar pe desktop e mai curat sa nu ramana vizibila sub fereastra de chat.
    function closePanel() {
      panel.classList.remove("open");
      launcher.style.display = "";
    }

    launcher.addEventListener("click", function () {
      var opening = !panel.classList.contains("open");
      panel.classList.toggle("open");
      if (opening) {
        launcher.style.display = "none";
        if (hasConsent()) {
          openChat();
        } else {
          closeOverlays();
          consentOverlay.classList.add("open");
        }
      } else {
        launcher.style.display = "";
      }
    });
    closeBtn.addEventListener("click", closePanel);

    panel.querySelectorAll(".scb-overlay-close").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeOverlays();
        closePanel();
      });
    });
    panel.querySelector(".scb-accept").addEventListener("click", function () {
      setConsent();
      closeOverlays();
      openChat();
    });
    panel.querySelector(".scb-decline").addEventListener("click", function () {
      consentOverlay.classList.remove("open");
      contactOverlay.classList.add("open");
    });
    panel.querySelector(".scb-close-wide").addEventListener("click", function () {
      closeOverlays();
      closePanel();
    });

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function escapeAttr(str) {
      return String(str).replace(/"/g, "&quot;");
    }

    // Transforma un subset minim de markdown (linkuri si bold) in HTML real.
    // Se aplica DUPA escapeHtml, deci tot ce nu e recunoscut ramane text
    // simplu, in siguranta - linkurile accepta doar URL-uri http/https (nu
    // javascript:, data: etc.), ca sa nu poata fi injectat cod prin raspunsul
    // generat de model sau prin continutul scanat de pe alte site-uri.
    function linkifyBotText(escapedText) {
      var withLinks = escapedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (match, label, url) {
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
      });
      return withLinks.replace(/\*\*([^*]+)\*\*/g, function (match, text) {
        return "<strong>" + text + "</strong>";
      });
    }

    function addMessage(role, text) {
      var el = document.createElement("div");
      el.className = "scb-msg " + role;
      if (role.indexOf("bot") === 0) {
        el.innerHTML = linkifyBotText(escapeHtml(text));
      } else {
        el.textContent = text;
      }
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    }

    // Randeaza sub mesajul botului cardurile de produs/serviciu recomandate
    // (imagine + titlu + buton), pentru linkurile care corespund unei pagini
    // scanate cu imagine reprezentativa cunoscuta.
    function addLinkCards(links) {
      if (!links || !links.length) return;
      var wrap = document.createElement("div");
      wrap.className = "scb-cards";
      links.forEach(function (link) {
        if (!link || !/^https?:\/\//i.test(link.url || "")) return;
        var safeImage = /^https?:\/\//i.test(link.image || "") ? link.image : "";
        var card = document.createElement("div");
        card.className = "scb-card";
        card.innerHTML =
          (safeImage
            ? '<img class="scb-card-img" src="' + escapeAttr(safeImage) + "\" alt=\"\" onerror=\"this.style.display='none'\" />"
            : '<div class="scb-card-img"></div>') +
          '<div class="scb-card-body">' +
          '<div class="scb-card-title">' + escapeHtml(link.title || link.label || "") + "</div>" +
          '<a class="scb-card-cta" href="' + escapeAttr(link.url) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(link.ctaLabel || "Vezi detalii") + " &rarr;</a>" +
          "</div>";
        wrap.appendChild(card);
      });
      if (wrap.children.length) {
        messagesEl.appendChild(wrap);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }

    // Buton microfon (optional) - doar in browserele care suporta Web Speech
    // API (Chrome/Edge/Safari); pe restul (ex: Firefox desktop) ramane ascuns,
    // nu afisam un buton decorativ care nu functioneaza.
    var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      var micBtn = document.createElement("button");
      micBtn.type = "button";
      micBtn.className = "scb-mic";
      micBtn.title = "Tine apasat pentru a vorbi";
      micBtn.setAttribute("aria-label", "Tine apasat pentru a vorbi");
      micBtn.innerHTML = MIC_ICON;
      sendBtn.parentNode.insertBefore(micBtn, sendBtn);

      var SPEECH_LANG = /engl/i.test(LANGUAGE) ? "en-US" : "ro-RO";
      var recognition = null;
      var recognizing = false;

      function startRecording() {
        if (recognizing) return;
        try {
          recognition = new SpeechRecognitionCtor();
          recognition.lang = SPEECH_LANG;
          recognition.interimResults = true;
          recognition.continuous = false;
          recognition.onresult = function (e) {
            var transcript = "";
            for (var i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
            textarea.value = transcript;
            autoGrow();
          };
          recognition.onend = function () {
            recognizing = false;
            micBtn.classList.remove("recording");
          };
          recognition.onerror = function () {
            recognizing = false;
            micBtn.classList.remove("recording");
          };
          recognition.start();
          recognizing = true;
          micBtn.classList.add("recording");
        } catch (e) {
          recognizing = false;
        }
      }
      function stopRecording() {
        if (recognition && recognizing) recognition.stop();
      }
      micBtn.addEventListener("mousedown", startRecording);
      micBtn.addEventListener("touchstart", function (e) {
        e.preventDefault();
        startRecording();
      });
      micBtn.addEventListener("mouseup", stopRecording);
      micBtn.addEventListener("mouseleave", stopRecording);
      micBtn.addEventListener("touchend", stopRecording);
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
      var historyToSend = conversation.slice(); // conversatia INAINTE de acest mesaj
      addMessage("user", text);
      textarea.value = "";
      autoGrow();
      sending = true;
      sendBtn.disabled = true;

      var typingEl = addMessage("bot typing", "Scrie...");

      fetch(API_URL.replace(/\/$/, "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId, history: historyToSend }),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || "Eroare server");
            return data;
          });
        })
        .then(function (data) {
          typingEl.remove();
          var replyText = data.reply || "Ne pare rau, nu am putut genera un raspuns.";
          addMessage("bot", replyText);
          addLinkCards(data.links);
          conversation.push({ role: "user", content: text });
          conversation.push({ role: "assistant", content: replyText });
          saveStoredHistory(conversation);
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
