import { renderHeader, renderFooter, renderLoadingGrid, renderEmptyState, renderErrorState, escapeHtml } from "./common.js";
import { db, collection, doc, getDoc, getDocs, orderBy, query } from "./firebase-config.js";

renderHeader("projects.html");
renderFooter();

const params = new URLSearchParams(location.search);
const projectId = params.get("id");

function projectCard(p) {
  const thumb = p.thumbnail || "";
  return `
    <div class="media-card">
      <div class="media-card-thumb">
        ${p.featured ? '<span class="badge-featured">Featured</span>' : ""}
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.title)}">` : ""}
      </div>
      <div class="media-card-body">
        <div class="media-card-title">${escapeHtml(p.title || "Untitled Project")}</div>
        <div class="media-card-desc">${escapeHtml(p.description || "")}</div>
        <div class="tech-pills">${(p.technologies || []).slice(0, 4).map(t => `<span class="tag tag-outline">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="media-card-actions">
          <a class="btn btn-outline" href="projects.html?id=${encodeURIComponent(p.id)}">View Project</a>
        </div>
      </div>
    </div>
  `;
}

async function loadGrid() {
  const mount = document.getElementById("projects-grid");
  renderLoadingGrid(mount, 6);
  try {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      renderEmptyState(mount, "No projects yet", "Projects Code by Me has worked on will be listed here.");
      return;
    }
    mount.innerHTML = snap.docs.map(d => projectCard({ id: d.id, ...d.data() })).join("");
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  }
}

async function loadDetail(id) {
  document.getElementById("projects-intro").style.display = "none";
  document.getElementById("projects-grid").style.display = "none";
  const mount = document.getElementById("project-detail");
  mount.innerHTML = `<div class="skeleton skeleton-card"></div>`;
  try {
    const snap = await getDoc(doc(db, "projects", id));
    if (!snap.exists()) {
      renderErrorState(mount, "This project could not be found. It may have been removed.");
      return;
    }
    const p = snap.data();
    mount.innerHTML = `
      <a href="projects.html" class="btn btn-outline" style="margin-bottom:24px;">&larr; All Projects</a>
      <div class="eyebrow">${escapeHtml(p.category || "Project")}</div>
      <h1>${escapeHtml(p.title || "Untitled Project")}</h1>
      <p class="lede">${escapeHtml(p.description || "")}</p>
      <div class="tech-pills" style="margin-bottom:24px;">${(p.technologies || []).map(t => `<span class="tag tag-outline">${escapeHtml(t)}</span>`).join("")}</div>
      ${p.thumbnail ? `<div class="media-card-thumb" style="border-radius:10px;margin-bottom:24px;"><img src="${escapeHtml(p.thumbnail)}" alt=""></div>` : ""}
      ${(p.screenshots || []).length ? `<div class="grid grid-2" style="margin-bottom:24px;">${p.screenshots.map(s => `<img src="${escapeHtml(s)}" style="border-radius:8px;border:1px solid var(--cbm-line);">`).join("")}</div>` : ""}
      ${p.video ? `<video controls style="border-radius:8px;margin-bottom:24px;width:100%;"><source src="${escapeHtml(p.video)}"></video>` : ""}
      <div class="hero-actions">
        ${p.liveDemo ? `<a href="${escapeHtml(p.liveDemo)}" target="_blank" rel="noopener" class="btn btn-dark">Live Demo</a>` : ""}
        ${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank" rel="noopener" class="btn btn-outline">View on GitHub</a>` : ""}
      </div>
    `;
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  }
}

if (projectId) {
  loadDetail(projectId);
} else {
  loadGrid();
}
