// =====================================================================
// COMMON.JS — shared across every page. Import as a module.
// =====================================================================

export const CBM = {
  whatsapp: "2349053047349", // international format, no + or leading 0-9053... adjust if needed
  whatsappDisplay: "09053047349",
  telegram: "@codebymewd",
  email: "codebymewd@gmail.com",
};

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "about.html", label: "About" },
  { href: "services.html", label: "Services" },
  { href: "projects.html", label: "Projects" },
  { href: "templates.html", label: "Templates" },
  { href: "apps-software.html", label: "Apps & Software" },
  { href: "contact.html", label: "Contact" },
  { href: "check-order.html", label: "Check Order" },
];

export function renderHeader(activePage) {
  const mount = document.getElementById("site-header");
  if (!mount) return;
  const links = NAV_LINKS.map(
    (l) =>
      `<a href="${l.href}" class="${activePage === l.href ? "active" : ""}">${l.label}</a>`
  ).join("");

  mount.innerHTML = `
    <div class="container">
      <a href="index.html" class="brand">
        <span class="brand-mark">CBM</span>
        <span class="brand-name">Code by Me</span>
      </a>
      <nav class="main-nav" id="main-nav">${links}</nav>
      <div class="header-actions">
        <button class="nav-toggle" id="nav-toggle" aria-label="Open menu"><span></span></button>
        <a href="contact.html" class="btn btn-primary">Start a Project</a>
      </div>
    </div>
  `;

  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("open"))
  );
}

export function renderFooter() {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  const year = new Date().getFullYear();
  mount.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="brand" style="color:#fff;margin-bottom:14px;">
            <span class="brand-mark">CBM</span>
            <span class="brand-name" style="color:#fff;">Code by Me</span>
          </div>
          <p>Build. Simplify. Grow.</p>
        </div>
        <div>
          <h4>Navigate</h4>
          <a href="index.html">Home</a>
          <a href="services.html">Services</a>
          <a href="templates.html">Templates</a>
          <a href="projects.html">Projects</a>
          <a href="contact.html">Contact</a>
        </div>
        <div>
          <h4>Contact</h4>
          <a href="https://wa.me/${CBM.whatsapp}" target="_blank" rel="noopener">WhatsApp — ${CBM.whatsappDisplay}</a>
          <a href="https://t.me/${CBM.telegram.replace("@", "")}" target="_blank" rel="noopener">Telegram — ${CBM.telegram}</a>
          <a href="mailto:${CBM.email}">${CBM.email}</a>
          <a href="https://vm.tiktok.com/ZS9ATTxwRQ3V1-oOhjl/" target="_blank" rel="noopener">TikTok</a>
          <a href="https://x.com/codebymewd" target="_blank" rel="noopener">X</a>
          <!-- Social links stay disabled until official accounts exist:
          <a href="#" target="_blank" rel="noopener">Instagram</a>
          <a href="#" target="_blank" rel="noopener">LinkedIn</a>
          -->
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${year} Code by Me. All rights reserved.</span>
        <span>Developed by Code by Me</span>
      </div>
    </div>
  `;
}

// ---------- Toasts ----------
let toastEl = null;
export function showToast(message, type = "default", duration = 3600) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.className = "toast " + (type === "error" ? "toast-error" : type === "success" ? "toast-success" : "");
  toastEl.textContent = message;
  requestAnimationFrame(() => toastEl.classList.add("show"));
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), duration);
}

// ---------- Formatting ----------
export function formatNaira(amount) {
  const n = Number(amount || 0);
  return "₦" + n.toLocaleString("en-NG");
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// ---------- Order ID ----------
export function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return "CBM-" + code;
}

// ---------- WhatsApp deep link ----------
export function buildWhatsAppLink({ customerName, templateName, orderId, packageLabel, extra = "" }) {
  let msg = `Hello Code by Me, I purchased ${templateName} with ${packageLabel}. My Order ID is ${orderId}.`;
  if (extra) msg += " " + extra;
  const encoded = encodeURIComponent(msg);
  return `https://wa.me/${CBM.whatsapp}?text=${encoded}`;
}

// ---------- Clipboard helper ----------
export async function copyToClipboard(value) {
  const text = String(value ?? "");
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Clipboard copy failed");
  return true;
}

// ---------- Generic async state renderer ----------
export function renderLoadingGrid(mount, count = 3) {
  mount.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton skeleton-card"></div>`)
    .join("");
}

export function renderEmptyState(mount, title, body) {
  mount.innerHTML = `<div class="state-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
}

export function renderErrorState(mount, message) {
  mount.innerHTML = `<div class="state-block"><h3>Something went wrong</h3><p>${escapeHtml(
    message || "We couldn't load this right now. Please refresh the page or try again shortly."
  )}</p></div>`;
}

// ---------- Simple form validation ----------
export function validateField(fieldEl, condition, message) {
  const wrap = fieldEl.closest(".form-field");
  const errorEl = wrap.querySelector(".field-error");
  if (!condition) {
    wrap.classList.add("has-error");
    if (errorEl) errorEl.textContent = message;
    return false;
  }
  wrap.classList.remove("has-error");
  return true;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
