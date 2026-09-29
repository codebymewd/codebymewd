import {
  renderHeader, renderFooter, renderErrorState, showToast, formatNaira, escapeHtml,
  generateOrderId, buildWhatsAppLink, isValidEmail, validateField, copyToClipboard
} from "./common.js";
import { db, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "./firebase-config.js";
import { uploadToCloudinary } from "./cloudinary-config.js";
import { notifyCBM } from "./notification-client.js";

renderHeader("templates.html");
renderFooter();

const params = new URLSearchParams(location.search);
const templateId = params.get("templateId");
const packageId = params.get("package");
const wantsApi = params.get("api") === "1";
const wantsSetup = params.get("setup") === "1";

const root = document.getElementById("checkout-root");

const DASHBOARD_LABELS = {
  hosted_static: "Hosted Admin Dashboard — Static",
  hosted_custom: "Hosted Admin Dashboard — Custom Domain",
  installable: "Installable Admin Dashboard",
};
function dashboardLabel(t) {
  if (t.adminDashboardType === "installable") return DASHBOARD_LABELS.installable;
  if (t.hostedType === "custom") return DASHBOARD_LABELS.hosted_custom;
  return DASHBOARD_LABELS.hosted_static;
}

let state = {
  template: null,
  settings: null,
  selectedPackage: null,
  customer: { name: "", email: "", phone: "" },
  screenshotUrl: null,
  amount: 0,
  orderId: null,
  orderData: null,
};

function computeAmount() {
  let amount = Number(state.selectedPackage?.price || 0);
  if (wantsApi && state.template.apiSetupPrice) amount += Number(state.template.apiSetupPrice);
  if (wantsSetup && state.template.setupPrice) amount += Number(state.template.setupPrice);
  state.amount = amount;
}

function summaryHtml() {
  const t = state.template;
  return `
    <div class="summary-box">
      <h3 style="margin-bottom:14px;">Order Summary</h3>
      <div class="summary-row"><span>Template</span><span>${escapeHtml(t.name)}</span></div>
      <div class="summary-row"><span>Package</span><span>${escapeHtml(state.selectedPackage.name)}</span></div>
      <div class="summary-row"><span>Admin Dashboard</span><span>${escapeHtml(dashboardLabel(t))}</span></div>
      ${wantsApi ? `<div class="summary-row"><span>API Setup</span><span>${t.apiSetupPrice ? formatNaira(t.apiSetupPrice) : "Included"}</span></div>` : ""}
      ${wantsSetup ? `<div class="summary-row"><span>Template Setup</span><span>${t.setupPrice ? formatNaira(t.setupPrice) : "Included"}</span></div>` : ""}
      <div class="summary-total"><span>Total</span><span>${formatNaira(state.amount)}</span></div>
    </div>
  `;
}

function renderStepInfo() {
  root.innerHTML = `
    <div class="checkout-layout">
      <div>
        <div class="eyebrow">Step 1 of 3</div>
        <h1>Your Information</h1>
        <p class="lede">Tell us who this order is for — we'll use this to confirm your purchase and reach you.</p>

        <form id="info-form" style="max-width:480px;margin-top:24px;">
          <div class="form-field">
            <label for="cust-name">Full name</label>
            <input id="cust-name" type="text" required>
            <div class="field-error">Please enter your full name.</div>
          </div>
          <div class="form-field">
            <label for="cust-email">Gmail / email</label>
            <input id="cust-email" type="email" required>
            <div class="field-error">Please enter a valid email address.</div>
          </div>
          <div class="form-field">
            <label for="cust-phone">WhatsApp / phone number</label>
            <input id="cust-phone" type="tel" required>
            <div class="field-error">Please enter your phone number.</div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Continue to Order Summary</button>
        </form>
      </div>
      <div>${summaryHtml()}</div>
    </div>
  `;

  document.getElementById("info-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById("cust-name");
    const emailEl = document.getElementById("cust-email");
    const phoneEl = document.getElementById("cust-phone");

    const okName = validateField(nameEl, nameEl.value.trim().length > 1, "Please enter your full name.");
    const okEmail = validateField(emailEl, isValidEmail(emailEl.value), "Please enter a valid email address.");
    const okPhone = validateField(phoneEl, phoneEl.value.trim().length >= 7, "Please enter your phone number.");
    if (!okName || !okEmail || !okPhone) return;

    state.customer = { name: nameEl.value.trim(), email: emailEl.value.trim(), phone: phoneEl.value.trim() };

    try {
      await createOrder();
      renderStepPayment();
    } catch (err) {
      console.error(err);
      showToast("We couldn't create your order. Please check your connection and try again.", "error");
    }
  });
}

function renderStepPayment() {
  const settings = state.settings || {};
  const bank = settings.paymentDetails || {};
  root.innerHTML = `
    <div class="checkout-layout">
      <div>
        <div class="eyebrow">Step 2 of 3</div>
        <h1>Payment</h1>
        <p class="lede">Transfer the total below to the account shown, then upload your payment screenshot.</p>

        <div class="bank-details">
          <div class="bank-row"><span>Bank Name</span><strong>${escapeHtml(bank.bankName || "—")}</strong><button type="button" class="copy-payment-btn" data-copy="${escapeHtml(bank.bankName || "")}">Copy</button></div>
          <div class="bank-row"><span>Account Name</span><strong>${escapeHtml(bank.accountName || "—")}</strong><button type="button" class="copy-payment-btn" data-copy="${escapeHtml(bank.accountName || "")}">Copy</button></div>
          <div class="bank-row"><span>Account Number</span><strong>${escapeHtml(bank.accountNumber || "—")}</strong><button type="button" class="copy-payment-btn" data-copy="${escapeHtml(bank.accountNumber || "")}">Copy</button></div>
          <div class="bank-row"><span>Order ID</span><strong>${escapeHtml(state.orderId || "—")}</strong><button type="button" class="copy-payment-btn" data-copy="${escapeHtml(state.orderId || "")}">Copy</button></div>
        </div>
        <p class="form-hint"><strong>Important:</strong> Copy your Order ID and keep it with your payment details. Use this Order ID when making your bank transfer where possible. If the payment page refreshes or you leave before completing payment, use your Order ID and email on <a href="check-order.html">Check Order Status</a> to continue your order.</p>
        ${bank.instructions ? `<p class="form-hint">${escapeHtml(bank.instructions)}</p>` : ""}

        <h3 style="margin-top:26px;">Upload Payment Screenshot</h3>
        <div id="upload-drop" class="upload-drop">
          <p style="margin:0;">Click to choose a screenshot of your transfer</p>
          <input type="file" id="screenshot-input" accept="image/*" style="display:none;">
        </div>
        <div id="upload-preview-wrap"></div>
        <p class="form-hint">Uploading a screenshot does not automatically confirm payment — we verify each transfer manually.</p>

        <button id="paid-btn" class="btn btn-primary btn-block" style="margin-top:20px;" disabled>I Have Made Payment</button>
        <button id="back-btn" class="btn btn-outline btn-block" style="margin-top:10px;">&larr; Back</button>
      </div>
      <div>${summaryHtml()}</div>
    </div>
  `;

  document.querySelectorAll(".copy-payment-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      if (!value) return;
      try {
        await copyToClipboard(value);
        const original = button.textContent;
        button.textContent = "Copied!";
        setTimeout(() => { button.textContent = original; }, 1200);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });
  });

  const dropEl = document.getElementById("upload-drop");
  const inputEl = document.getElementById("screenshot-input");
  const previewWrap = document.getElementById("upload-preview-wrap");
  const paidBtn = document.getElementById("paid-btn");

  dropEl.addEventListener("click", () => inputEl.click());
  inputEl.addEventListener("change", async () => {
    const file = inputEl.files[0];
    if (!file) return;
    dropEl.innerHTML = `<p style="margin:0;">Uploading…</p>`;
    try {
      const { url } = await uploadToCloudinary(file);
      state.screenshotUrl = url;
      dropEl.innerHTML = `<p style="margin:0;">Screenshot uploaded — click to replace</p>`;
      previewWrap.innerHTML = `<div class="upload-preview"><img src="${escapeHtml(url)}" alt="Payment screenshot"></div>`;
      paidBtn.disabled = false;
    } catch (err) {
      console.error(err);
      showToast("We couldn't upload that screenshot. Please try again.", "error");
      dropEl.innerHTML = `<p style="margin:0;">Click to choose a screenshot of your transfer</p>`;
    }
  });

  document.getElementById("back-btn").addEventListener("click", renderStepInfo);

  paidBtn.addEventListener("click", async () => {
    paidBtn.disabled = true;
    paidBtn.textContent = "Submitting order…";
    try {
      await submitOrder();
    } catch (err) {
      console.error(err);
      showToast("We couldn't submit your order. Please check your connection and try again.", "error");
      paidBtn.disabled = false;
      paidBtn.textContent = "I Have Made Payment";
    }
  });
}

async function createOrder() {
  if (state.orderId) return state.orderId;

  const orderId = generateOrderId();
  const t = state.template;
  const orderData = {
    orderId,
    customerName: state.customer.name,
    email: state.customer.email,
    phone: state.customer.phone,
    templateId,
    templateName: t.name,
    package: state.selectedPackage.name,
    adminDashboardType: dashboardLabel(t),
    hostedType: t.hostedType || null,
    apiRequired: !!wantsApi,
    setupRequested: !!wantsSetup,
    amount: state.amount,
    paymentScreenshot: null,
    paymentStatus: "Not Submitted",
    orderStatus: "Awaiting Payment",
    declineReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Firestore order creation is always completed before notifications run.
  await setDoc(doc(db, "orders", orderId), orderData);
  state.orderId = orderId;
  state.orderData = orderData;

  // Email/push notification failure must never make a successful order look failed.
  void notifyCBM({ type: "order.created", orderId }).catch((notificationError) => {
    console.warn("Order created, but notification delivery failed:", notificationError);
  });

  return orderId;
}

async function submitOrder() {
  if (!state.orderId) {
    await createOrder();
  }

  const updates = {
    paymentScreenshot: state.screenshotUrl,
    paymentStatus: "Payment Submitted",
    orderStatus: "Awaiting Verification",
    updatedAt: serverTimestamp(),
  };

  // Update Firestore first. Notifications only run after payment is saved.
  await updateDoc(doc(db, "orders", state.orderId), updates);
  state.orderData = { ...state.orderData, ...updates };

  void notifyCBM({ type: "payment.submitted", orderId: state.orderId }).catch((notificationError) => {
    console.warn("Payment submitted, but notification delivery failed:", notificationError);
  });

  renderStepDone(state.orderId, state.orderData);
}

function renderStepDone(orderId, orderData) {
  const t = state.template;
  const extraParts = [];
  if (wantsSetup) extraParts.push("I would like to provide my website information for setup.");
  if (wantsApi) extraParts.push("I would like to continue with the API setup.");
  if (t.adminDashboardType !== "installable") extraParts.push("I would like to continue with the admin dashboard setup.");
  const packageLabel = [state.selectedPackage.name, wantsSetup ? "Template Setup" : null, wantsApi ? "API Setup" : null]
    .filter(Boolean).join(" + ");

  const waLink = buildWhatsAppLink({
    customerName: orderData.customerName,
    templateName: t.name,
    orderId,
    packageLabel,
    extra: extraParts.join(" "),
  });

  root.innerHTML = `
    <div style="max-width:620px;">
      <div class="eyebrow">Step 3 of 3</div>
      <h1>Order Received</h1>
      <p class="lede">Thank you, ${escapeHtml(orderData.customerName)}. Your payment is awaiting verification. Save this Order ID — you'll need it to check your order status.</p>
      <div class="order-id-display">${escapeHtml(orderId)}</div>

      <h3 style="margin-top:30px;">What happens next</h3>
      <ul class="info-list">
        <li>We verify your payment against the screenshot you submitted.</li>
        <li>Once confirmed, you'll receive an Order Confirmation email with your ${escapeHtml(state.selectedPackage.name)} package details.</li>
        <li>You can download your package once payment is completed at <b>CHECK ORDER</b></li>
        <li>${wantsSetup || wantsApi || t.adminDashboardType !== "installable" ? "Our team will reach out on WhatsApp to continue setup." : "."}</li>
      </ul>

      <div class="hero-actions" style="margin-top:24px;">
        <a href="check-order.html" class="btn btn-dark">Check Order Status</a>
        <a href="${waLink}" target="_blank" rel="noopener" class="btn whatsapp-btn">Message Us on WhatsApp</a>
        <a href="index.html" class="btn btn-outline">Back to Home</a>
      </div>
    </div>
  `;
}

async function init() {
  if (!templateId || !packageId) {
    renderErrorState(root, "Missing template or package information. Please start again from the template page.");
    return;
  }
  try {
    const [templateSnap, settingsSnap] = await Promise.all([
      getDoc(doc(db, "templates", templateId)),
      getDoc(doc(db, "settings", "general")),
    ]);
    if (!templateSnap.exists()) {
      renderErrorState(root, "This template could not be found.");
      return;
    }
    state.template = templateSnap.data();
    state.settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const packages = Array.isArray(state.template.packages) && state.template.packages.length
      ? state.template.packages
      : [{ id: "template-only", name: "Template Only", price: state.template.price }];
    state.selectedPackage = packages.find(p => (p.id || "") === packageId) || packages[0];

    computeAmount();
    renderStepInfo();
  } catch (err) {
    console.error(err);
    renderErrorState(root);
  }
}

init();
