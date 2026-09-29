import { renderHeader, renderFooter, renderErrorState, formatNaira, escapeHtml, showToast } from "./common.js";
import { db, doc, getDoc } from "./firebase-config.js";

renderHeader("templates.html");
renderFooter();

const params = new URLSearchParams(location.search);
const templateId = params.get("id");
const mount = document.getElementById("template-detail");

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

function render(t) {
  const packages = Array.isArray(t.packages) && t.packages.length
    ? t.packages
    : [{ id: "template-only", name: "Template Only", price: t.price, includes: [
        "Website source files",
        "Its corresponding admin dashboard access",
        "Assets",
        "Setup documentation",
        "Required files",
      ] }];

  mount.innerHTML = `
    <a href="templates.html" class="btn btn-outline" style="margin-bottom:24px;">&larr; All Templates</a>

    <div class="grid grid-2" style="align-items:start;gap:48px;">
      <div>
        ${t.previewImage ? `<div class="media-card-thumb" style="border-radius:10px;margin-bottom:16px;"><img src="${escapeHtml(t.previewImage)}" alt="${escapeHtml(t.name)}"></div>` : ""}
        ${(t.screenshots || []).length ? `<div class="grid grid-2">${t.screenshots.map(s => `<img src="${escapeHtml(s)}" style="border-radius:8px;border:1px solid var(--cbm-line);">`).join("")}</div>` : ""}
        ${t.promoVideo ? `<video controls style="border-radius:8px;margin-top:16px;width:100%;"><source src="${escapeHtml(t.promoVideo)}"></video>` : ""}
      </div>

      <div>
        <div class="eyebrow">${escapeHtml((t.technologies || []).join(" · ")) || "Ready-Made Template"}</div>
        <h1>${escapeHtml(t.name || "Untitled Template")}</h1>
        <p class="lede">${escapeHtml(t.description || "")}</p>

        <div class="dashboard-type-note">
          <strong>Admin dashboard:</strong> ${escapeHtml(dashboardLabel(t))}
        </div>

        ${t.apiRequired ? `
        <div class="dashboard-type-note">
          <strong>API setup available:</strong> ${escapeHtml((t.apiService || []).join(", ") || "Third-party service integration")}
        </div>` : ""}

        ${(t.features || []).length ? `
        <h3 style="margin-top:24px;">Features</h3>
        <ul class="info-list">${t.features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}

        <h3 style="margin-top:24px;">Choose a package</h3>
        <div id="package-list" style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">
          ${packages.map((p, i) => `
            <div class="package-card ${i === 0 ? "selected" : ""}" data-package-id="${escapeHtml(p.id || String(i))}" data-price="${Number(p.price || 0)}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <h4>${escapeHtml(p.name)}</h4>
                <span class="price">${formatNaira(p.price)}</span>
              </div>
              ${(p.includes || []).length ? `<ul class="package-list">${p.includes.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
            </div>
          `).join("")}
        </div>

        ${t.apiRequired ? `
        <label style="display:flex;gap:10px;align-items:center;margin-top:18px;font-size:14.5px;">
          <input type="checkbox" id="add-api" style="width:auto;">
          Add API setup ${(t.apiService || []).length ? `(${escapeHtml(t.apiService.join(", "))})` : ""}
        </label>` : ""}

        ${t.setupAvailable ? `
        <label style="display:flex;gap:10px;align-items:center;margin-top:10px;font-size:14.5px;">
          <input type="checkbox" id="add-setup" style="width:auto;">
          Add Template Setup service ${t.setupPrice ? `(+ ${formatNaira(t.setupPrice)})` : ""}
        </label>` : ""}

        <div style="margin-top:26px;display:flex;gap:14px;flex-wrap:wrap;">
          <button id="purchase-btn" class="btn btn-primary">Purchase</button>
          ${t.livePreview ? `<a href="${escapeHtml(t.livePreview)}" target="_blank" rel="noopener" class="btn btn-outline">Live Preview</a>` : ""}
        </div>
      </div>
    </div>
  `;

  let selectedPackageId = packages[0].id || "0";
  document.querySelectorAll(".package-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".package-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedPackageId = card.dataset.packageId;
    });
  });

  document.getElementById("purchase-btn").addEventListener("click", () => {
    const addApi = document.getElementById("add-api")?.checked ? "1" : "0";
    const addSetup = document.getElementById("add-setup")?.checked ? "1" : "0";
    const url = `checkout.html?templateId=${encodeURIComponent(templateId)}&package=${encodeURIComponent(selectedPackageId)}&api=${addApi}&setup=${addSetup}`;
    window.location.href = url;
  });
}

async function load() {
  if (!templateId) {
    renderErrorState(mount, "No template was specified.");
    return;
  }
  try {
    const snap = await getDoc(doc(db, "templates", templateId));
    if (!snap.exists() || snap.data().active === false) {
      renderErrorState(mount, "This template is not available. It may have been removed or is not yet published.");
      return;
    }
    render(snap.data());
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  }
}

load();
