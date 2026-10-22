(function () {
  "use strict";

  var cfg = window.NOER_CONFIG || {};
  var API_BASE = cfg.API_BASE || "";
  var TIMEOUT = cfg.REQUEST_TIMEOUT_MS || 20000;
  var LOGO_LIGHT = cfg.LOGO_LIGHT || "assets/logo-light.svg";
  var LOGO_DARK  = cfg.LOGO_DARK  || "assets/logo-dark.svg";
  var HERO_LIGHT = cfg.HERO_LIGHT || "assets/hero-light.png";
  var HERO_DARK  = cfg.HERO_DARK  || "assets/hero-dark.png";
  var root = document.documentElement;

  /* ========== THEME ========== */
  var Theme = {
    current: function () { return root.getAttribute("data-theme") || "light"; },
    apply: function (theme) {
      root.setAttribute("data-theme", theme);
      var meta = document.getElementById("meta-theme");
      if (meta) meta.setAttribute("content", theme === "dark" ? "#0B0F14" : "#2563EB");
      try { localStorage.setItem("noer_theme", theme); } catch (e) {}
      Theme.swapAssets(theme);
    },
    swapAssets: function (theme) {
      var logoSrc = theme === "dark" ? LOGO_DARK : LOGO_LIGHT;
      var heroSrc = theme === "dark" ? HERO_DARK : HERO_LIGHT;

      document.querySelectorAll('img[data-theme-logo="1"]').forEach(function (img) {
        if (img.getAttribute("src") !== logoSrc) img.setAttribute("src", logoSrc);
      });
      document.querySelectorAll('img[data-theme-hero="1"]').forEach(function (img) {
        if (img.getAttribute("src") !== heroSrc) img.setAttribute("src", heroSrc);
      });
    },
    init: function () {
      Theme.swapAssets(Theme.current());
      var btn = document.getElementById("theme-toggle");
      if (btn) btn.addEventListener("click", function () {
        Theme.apply(Theme.current() === "dark" ? "light" : "dark");
      });
      if (window.matchMedia) {
        var mq = window.matchMedia("(prefers-color-scheme: dark)");
        var onChange = function (e) {
          try {
            if (!localStorage.getItem("noer_theme")) {
              root.setAttribute("data-theme", e.matches ? "dark" : "light");
              var meta = document.getElementById("meta-theme");
              if (meta) meta.setAttribute("content", e.matches ? "#0B0F14" : "#2563EB");
              Theme.swapAssets(e.matches ? "dark" : "light");
            }
          } catch (err) {}
        };
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
    }
  };

  /* ========== API ========== */
  function request(path, params) {
    var url = new URL(API_BASE + path);
    if (params) Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT);
    return fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store"
    }).finally(function () { clearTimeout(timer); });
  }

  async function parse(res) {
    var data;
    try { data = await res.json(); }
    catch (e) { return { ok: false, status: res.status, message: "Respons server tidak valid.", data: null }; }
    if (res.status === 429) return { ok: false, status: 429, message: (data && data.message) || "Batas permintaan harian telah tercapai.", data: data };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, message: "Akses ditolak.", data: data };
    if (res.status === 404) return { ok: false, status: 404, message: "Endpoint tidak ditemukan.", data: data };
    if (res.status >= 500) return { ok: false, status: res.status, message: "Server sedang tidak tersedia. Coba lagi nanti.", data: data };
    if (!res.ok) return { ok: false, status: res.status, message: (data && data.message) || "Permintaan gagal.", data: data };
    if (!data || data.status !== true) return { ok: false, status: res.status, message: (data && data.message) || "Permintaan gagal.", data: data };
    return { ok: true, status: res.status, data: data };
  }

  /* ========== HELPERS ========== */
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function formatDate(ms) {
    if (!ms) return "-";
    try {
      var n = Number(ms);
      if (isNaN(n) || n <= 0) return "-";
      return new Date(n).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return "-"; }
  }
  function notify(el, type, message) {
    if (!el) return;
    el.hidden = false;
    el.className = "notification notification-" + type;
    el.textContent = message;
  }
  function hideNotify(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }
  function saveQuota(q) {
    try {
      var payload = Object.assign({}, q, { date: new Date().toISOString().slice(0, 10) });
      localStorage.setItem("noer_quota", JSON.stringify(payload));
    } catch (e) {}
  }

  /* ========== DRAWER ========== */
  function initDrawer() {
    var menuBtn = document.getElementById("menu-btn");
    var drawer = document.getElementById("drawer");
    var backdrop = document.getElementById("drawer-backdrop");
    var closeBtn = document.getElementById("drawer-close");
    if (!drawer) return;
    function open() {
      drawer.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function close() {
      drawer.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    if (menuBtn) menuBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) close();
    });
  }

  /* ========== ANIMATIONS ========== */
  function initAnimations() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var reveals = document.querySelectorAll(".reveal");
    if (reduce) {
      reveals.forEach(function (el) { el.classList.add("in"); });
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* ========== LANDING ========== */
  function initLanding() {
    var usedEl = document.getElementById("limit-used");
    if (!usedEl) return;
    var fillEl = document.getElementById("limit-fill");
    var totalEl = document.getElementById("limit-total");
    var subEl = document.getElementById("limit-sub");
    function readQuota() {
      try {
        var raw = localStorage.getItem("noer_quota");
        if (!raw) return null;
        var q = JSON.parse(raw);
        if (!q || !q.total) return null;
        if (q.date && q.date !== new Date().toISOString().slice(0, 10)) return null;
        return q;
      } catch (e) { return null; }
    }
    var q = readQuota();
    if (!q) return;
    var used = q.total.used, total = q.total.limit;
    if (totalEl) totalEl.textContent = total;
    if (fillEl) fillEl.style.width = Math.min(100, Math.round((used / total) * 100)) + "%";
    if (subEl) subEl.textContent = "Sisa " + q.total.remaining + " dari " + total +
      " permintaan (send " + q.send.used + "/" + q.send.limit +
      ", verif " + q.verif.used + "/" + q.verif.limit + ").";
    usedEl.textContent = used;
  }

  /* ========== SEND PAGE ========== */
  function initSendPage() {
    var form = document.getElementById("send-form");
    if (!form) return;
    var emailInput = document.getElementById("email");
    var emailError = document.getElementById("email-error");
    var agree = document.getElementById("agree");
    var submitBtn = document.getElementById("submit-btn");
    var btnLabel = submitBtn.querySelector(".btn-label");
    var btnSpinner = submitBtn.querySelector(".btn-spinner");
    var verifyLink = document.getElementById("verify-link");
    var verifyHint = document.getElementById("verify-hint");
    var notification = document.getElementById("notification");
    var quotaInfo = document.getElementById("quota-info");
    var inFlight = false;

    function setVerifyEnabled(enabled, email) {
      if (!verifyLink) return;
      if (enabled) {
        verifyLink.style.pointerEvents = "";
        verifyLink.style.opacity = "";
        verifyLink.removeAttribute("aria-disabled");
        verifyLink.removeAttribute("tabindex");
        verifyLink.href = "verif.html" + (email ? "?email=" + encodeURIComponent(email) : "");
        if (verifyHint) verifyHint.hidden = true;
      } else {
        verifyLink.style.pointerEvents = "none";
        verifyLink.style.opacity = "0.5";
        verifyLink.setAttribute("aria-disabled", "true");
        verifyLink.setAttribute("tabindex", "-1");
        verifyLink.href = "verif.html";
        if (verifyHint) verifyHint.hidden = false;
      }
    }
    setVerifyEnabled(false);

    function setLoading(loading) {
      submitBtn.disabled = loading;
      btnLabel.textContent = loading ? "Memproses..." : "Send Request";
      btnSpinner.hidden = !loading;
    }
    function setEmailError(msg) {
      emailError.hidden = !msg;
      emailError.textContent = msg || "";
      emailInput.classList.toggle("input-error", !!msg);
    }
    function showQuota(q) {
      if (!q || !q.send || !quotaInfo) return;
      quotaInfo.hidden = false;
      quotaInfo.innerHTML = "<span>Sisa kuota harian</span><span><b>" + q.send.remaining + "</b> / " + q.send.limit + " (send)</span>";
      saveQuota(q);
    }

    emailInput.addEventListener("input", function () {
      if (!emailError.hidden) setEmailError("");
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (inFlight) return;
      hideNotify(notification);
      setEmailError("");
      var email = emailInput.value.trim();
      if (!email) { setEmailError("Email wajib diisi."); return; }
      if (!isValidEmail(email)) { setEmailError("Format email tidak valid."); return; }
      if (!agree.checked) { notify(notification, "error", "Centang persetujuan terlebih dahulu."); return; }
      
      inFlight = true;
      setLoading(true);
      try {
        var res = await request("/activate", { email: email, options: "send", url: window.location.origin });
        var result = await parse(res);
        if (result.data && result.data._quota) showQuota(result.data._quota);
        
        if (!result.ok) {
          if (result.status === 429) notify(notification, "error", "Batas permintaan harian telah tercapai.");
          else notify(notification, "error", result.message);
          return;
        }
        setVerifyEnabled(true, email);
        notify(notification, "success", result.data.message || "Permintaan berhasil dikirim.");
        try { sessionStorage.setItem("noer_last_email", email); } catch (e) {}
      } catch (err) {
        notify(notification, "error", "Gagal menghubungi server.");
      } finally {
        inFlight = false;
        setLoading(false);
      }
    });
  }

  /* ========== VERIFY PAGE ========== */
  function initVerifyPage() {
    var form = document.getElementById("verify-form");
    if (!form) return;
    var emailInput = document.getElementById("email");
    var codeInput = document.getElementById("code");
    var emailError = document.getElementById("email-error");
    var codeError = document.getElementById("code-error");
    var submitBtn = document.getElementById("verify-btn");
    var btnLabel = submitBtn.querySelector(".btn-label");
    var btnSpinner = submitBtn.querySelector(".btn-spinner");
    var notification = document.getElementById("notification");
    var quotaInfo = document.getElementById("quota-info");
    var resultBox = document.getElementById("result-box");
    var resultIcon = document.getElementById("result-icon");
    var resultTitle = document.getElementById("result-title");
    var resultMsg = document.getElementById("result-msg");
    var resultDetails = document.getElementById("result-details");
    var nextActions = document.getElementById("next-actions");
    var inFlight = false;

    var params = new URLSearchParams(window.location.search);
    if (params.get("email")) emailInput.value = params.get("email");
    else { try { var last = sessionStorage.getItem("noer_last_email"); if (last) emailInput.value = last; } catch (e) {} }
    if (params.get("code")) codeInput.value = params.get("code");

    function setLoading(loading) {
      submitBtn.disabled = loading;
      btnLabel.textContent = loading ? "Memverifikasi..." : "Verify";
      btnSpinner.hidden = !loading;
    }
    function setError(el, input, msg) {
      el.hidden = !msg;
      el.textContent = msg || "";
      input.classList.toggle("input-error", !!msg);
    }
    function showQuota(q) {
      if (!q || !q.verif || !quotaInfo) return;
      quotaInfo.hidden = false;
      quotaInfo.innerHTML = "<span>Sisa kuota harian</span><span><b>" + q.verif.remaining + "</b> / " + q.verif.limit + " (verif)</span>";
      saveQuota(q);
    }
    function row(label, value, cls) {
      var div = document.createElement("div");
      div.className = "detail-row";
      var l = document.createElement("span"); l.className = "detail-label"; l.textContent = label;
      var v = document.createElement("span"); v.className = "detail-value" + (cls ? " " + cls : ""); v.textContent = value;
      div.appendChild(l); div.appendChild(v);
      return div;
    }
    function renderResult(data, isSuccess) {
      resultBox.hidden = false;
      resultDetails.innerHTML = "";
      resultIcon.className = "result-icon " + (isSuccess ? "success" : "error");
      resultIcon.innerHTML = isSuccess
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      resultTitle.textContent = isSuccess ? "Verifikasi Berhasil" : "Verifikasi Gagal";
      resultMsg.textContent = (data && data.message) || "Tidak ada pesan dari server.";
      if (!isSuccess) return;
      var vd = data && data.data && data.data.verify_data && data.data.verify_data.result;
      if (data.data && data.data.code_order) resultDetails.appendChild(row("Kode Order", data.data.code_order));
      if (data.data && data.data.email) resultDetails.appendChild(row("Email", data.data.email));
      if (vd) {
        resultDetails.appendChild(row("Status", vd.valid ? "Aktif" : "Tidak Aktif", vd.valid ? "ok" : "bad"));
        if (vd.accountLinkStatus) resultDetails.appendChild(row("Account Link", vd.accountLinkStatus));
        resultDetails.appendChild(row("Auto Renew", vd.autoRenewing ? "Ya" : "Tidak"));
        resultDetails.appendChild(row("Mulai", formatDate(vd.startTimeMillis)));
        resultDetails.appendChild(row("Kadaluarsa", formatDate(vd.expiryTimeMillis)));
      }
      if (nextActions) nextActions.hidden = false;
    }

    [emailInput, codeInput].forEach(function (input) {
      input.addEventListener("input", function () {
        if (input === emailInput) setError(emailError, emailInput, "");
        if (input === codeInput) setError(codeError, codeInput, "");
      });
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (inFlight) return;
      hideNotify(notification);
      if (resultBox) resultBox.hidden = true;
      if (nextActions) nextActions.hidden = true;
      setError(emailError, emailInput, "");
      setError(codeError, codeInput, "");
      
      var email = emailInput.value.trim();
      var code = codeInput.value.trim(); // TIDAK DIPOTONG! Kirim URL utuh.

      if (!email) { setError(emailError, emailInput, "Email wajib diisi."); return; }
      if (!isValidEmail(email)) { setError(emailError, emailInput, "Format email tidak valid."); return; }
      if (!code) { setError(codeError, codeInput, "Kode order / URL wajib diisi."); return; }
      
      inFlight = true;
      setLoading(true);
      try {
        var res = await request("/activate", { email: email, options: "verif", url: code });
        var result = await parse(res);
        if (result.data && result.data._quota) showQuota(result.data._quota);
        
        if (!result.ok) {
          if (result.status === 429) notify(notification, "error", "Batas permintaan harian telah tercapai.");
          else notify(notification, "error", result.message);
          return;
        }
        renderResult(result.data, true);
      } catch (err) {
        notify(notification, "error", "Gagal menghubungi server.");
      } finally {
        inFlight = false;
        setLoading(false);
      }
    });
  }

  /* ========== INIT ========== */
  function init() {
    Theme.init();
    initDrawer();
    initAnimations();
    initLanding();
    initSendPage();
    initVerifyPage();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();