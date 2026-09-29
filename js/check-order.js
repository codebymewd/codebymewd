import { renderHeader, renderFooter, renderErrorState, formatNaira, escapeHtml, isValidEmail, validateField, buildWhatsAppLink } from "./common.js";
import { db, doc, getDoc } from "./firebase-config.js";

renderHeader("check-order.html");
renderFooter();

const STATUS_ORDER = ["Awaiting Verification", "Payment Confirmed", "Processing", "Ready", "Completed"];

function statusSteps(current) {
  if (current === "Declined" || current === "Cancelled") {
    return `<div class="state-block"><h3>Order ${escapeHtml(current)}</h3><p>Please contact us on WhatsApp if you believe this is a mistake.</p></div>`;
  }
  const idx = Math.max(STATUS_ORDER.indexOf(current), 0);
  return `<div class="steps">${STATUS_ORDER.map((s, i) => `
    <div class="step ${i < idx ? "step-done" : i === idx ? "step-active" : ""}">
      <div class="step-num">${i + 1}</div>
      <div>${escapeHtml(s)}</div>
    </div>
  `).join("")}</div>`;
}

function fileRow(label, file) {
  if (!file || !file.url) return "";
  return `
    <div class="summary-row">
      <span>${escapeHtml(label)}</span>
      <a href="${escapeHtml(file.url)}" target="_blank" rel="noopener" class="btn btn-dark btn-sm">Download</a>
    </div>
  `;
}

async function downloadsSectionHtml(order) {
  if (order.paymentStatus !== "Payment Confirmed" || !order.templateId) return "";
  try {
    const snap = await getDoc(doc(db, "templates", order.templateId));
    if (!snap.exists()) return "";
    const t = snap.data();
    const rows = [
      fileRow("Website Files", t.websiteFile),
      t.adminDashboardIncluded ? fileRow("Admin Dashboard", t.adminDashboardFile) : "",
      fileRow("Setup Instructions", t.setupInstructionsFile),
    ].filter(Boolean);
    if (!rows.length) return "";
    return `
      <h4 style="margin-top:22px;">Your Downloads</h4>
      <div class="bank-details">${rows.join("")}</div>
    `;
  } catch (err) {
    console.error(err);
    return "";
  }
}

async function renderOrder(order) {
  const mount = document.getElementById("order-result");
  const waLink = buildWhatsAppLink({
    customerName: order.customerName,
    templateName: order.templateName,
    orderId: order.orderId,
    packageLabel: order.package,
    extra: "I'd like an update on my order.",
  });
  const downloads = await downloadsSectionHtml(order);
  mount.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h3 style="margin:0;">${escapeHtml(order.orderId)}</h3>
        <span class="tag">${escapeHtml(order.orderStatus)}</span>
      </div>
      <ul class="info-list" style="margin-top:16px;">
        <li>Template: ${escapeHtml(order.templateName)}</li>
        <li>Package: ${escapeHtml(order.package)}</li>
        <li>Admin Dashboard: ${escapeHtml(order.adminDashboardType || "—")}</li>
        <li>Amount: ${formatNaira(order.amount)}</li>
        <li>Payment: ${escapeHtml(order.paymentStatus)}</li>
      </ul>
      <h4 style="margin-top:22px;">Order Progress</h4>
      ${statusSteps(order.orderStatus)}
      ${downloads || `<p class="form-hint" style="margin-top:16px;">Your downloads will appear here once payment is confirmed.</p>`}
      <a href="${waLink}" target="_blank" rel="noopener" class="btn whatsapp-btn" style="margin-top:20px;">Message Us About This Order</a>
    </div>
  `;
}

document.getElementById("check-order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const emailEl = document.getElementById("lookup-email");
  const orderIdEl = document.getElementById("lookup-order-id");
  const btn = document.getElementById("lookup-btn");
  const mount = document.getElementById("order-result");

  const okEmail = validateField(emailEl, isValidEmail(emailEl.value), "Please enter a valid email address.");
  const okId = validateField(orderIdEl, orderIdEl.value.trim().length > 3, "Please enter your Order ID.");
  if (!okEmail || !okId) return;

  const orderId = orderIdEl.value.trim().toUpperCase();
  const email = emailEl.value.trim().toLowerCase();

  btn.disabled = true;
  btn.textContent = "Checking…";
  mount.innerHTML = `<div class="skeleton skeleton-card" style="height:220px;"></div>`;

  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    // Both the Order ID (unguessable, high-entropy) and a matching email are
    // required before any order detail is shown — this keeps customers from
    // browsing each other's orders even though lookup has no login step.
    if (!snap.exists() || String(snap.data().email || "").toLowerCase() !== email) {
      renderErrorState(mount, "We couldn't find an order matching that email and Order ID. Please double-check and try again.");
    } else {
      await renderOrder(snap.data());
    }
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  } finally {
    btn.disabled = false;
    btn.textContent = "Check Order";
  }
});
