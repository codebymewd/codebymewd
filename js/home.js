import { renderHeader, renderFooter, renderLoadingGrid, renderEmptyState, renderErrorState, formatNaira, escapeHtml } from "./common.js";
import { db, collection, query, where, orderBy, limit, getDocs } from "./firebase-config.js";

renderHeader("index.html");
renderFooter();

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

function templateCard(t) {
  const thumb = t.previewImage || "";
  return `
    <div class="media-card">
      <div class="media-card-thumb">
        ${t.featured ? '<span class="badge-featured">Featured</span>' : ""}
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(t.name)}">` : ""}
      </div>
      <div class="media-card-body">
        <div class="media-card-title">${escapeHtml(t.name || "Untitled Template")}</div>
        <div class="media-card-desc">${escapeHtml(t.description || "")}</div>
        <div class="media-card-meta">
          <span class="price">${t.price != null ? formatNaira(t.price) : "Price on request"}</span>
        </div>
        <div class="media-card-actions">
          <a class="btn btn-dark" href="template-details.html?id=${encodeURIComponent(t.id)}">View Details</a>
        </div>
      </div>
    </div>
  `;
}

async function loadFeaturedProjects() {
  const mount = document.getElementById("featured-projects");
  renderLoadingGrid(mount, 3);
  try {
    const q = query(collection(db, "projects"), where("featured", "==", true), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) {
      renderEmptyState(mount, "Projects are on the way", "Featured projects will appear here once they're added.");
      return;
    }
    mount.innerHTML = snap.docs.map(d => projectCard({ id: d.id, ...d.data() })).join("");
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  }
}

async function loadFeaturedTemplates() {
  const mount = document.getElementById("featured-templates");
  renderLoadingGrid(mount, 3);
  try {
    const q = query(
      collection(db, "templates"),
      where("active", "==", true),
      where("featured", "==", true),
      limit(3)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      renderEmptyState(mount, "New templates are coming soon", "The Code by Me marketplace is being stocked with real, ready-made templates.");
      return;
    }
    mount.innerHTML = snap.docs.map(d => templateCard({ id: d.id, ...d.data() })).join("");
  } catch (err) {
    console.error(err);
    renderErrorState(mount);
  }
}

loadFeaturedProjects();
loadFeaturedTemplates();
