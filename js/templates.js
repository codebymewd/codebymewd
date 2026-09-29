import {
  renderHeader,
  renderFooter,
  renderLoadingGrid,
  renderEmptyState,
  renderErrorState,
  formatNaira,
  escapeHtml
} from "./common.js";

import {
  db,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "./firebase-config.js";

renderHeader("templates.html");
renderFooter();

const CATEGORIES = [
  "Business",
  "Portfolio",
  "Restaurant",
  "Fashion",
  "Beauty",
  "Gadgets"
];

const PREVIEW_COUNT = 3;

function templateCard(t) {
  const thumb = t.previewImage || "";

  return `
    <div class="media-card">
      <div class="media-card-thumb">
        ${
          t.featured
            ? '<span class="badge-featured">Featured</span>'
            : ""
        }

        ${
          thumb
            ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(
                t.name || "Template"
              )}">`
            : ""
        }
      </div>

      <div class="media-card-body">
        <div class="media-card-title">
          ${escapeHtml(t.name || "Untitled Template")}
        </div>

        <div class="media-card-desc">
          ${escapeHtml(t.description || "")}
        </div>

        <div class="tech-pills">
          ${(t.technologies || [])
            .slice(0, 4)
            .map(
              (x) =>
                `<span class="tag tag-outline">${escapeHtml(x)}</span>`
            )
            .join("")}
        </div>

        <div class="media-card-meta">
          <span class="price">
            ${
              t.price != null
                ? formatNaira(t.price)
                : "Price on request"
            }
          </span>
        </div>

        <div class="media-card-actions">
          ${
            t.livePreview
              ? `
                <a
                  class="btn btn-outline"
                  href="${escapeHtml(t.livePreview)}"
                  target="_blank"
                  rel="noopener"
                >
                  Live Preview
                </a>
              `
              : ""
          }

          <a
            class="btn btn-dark"
            href="template-details.html?id=${encodeURIComponent(t.id)}"
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  `;
}

function categorySection(category, templates, index) {
  if (!templates.length) return "";

  const first = templates.slice(0, PREVIEW_COUNT);
  const rest = templates.slice(PREVIEW_COUNT);
  const moreId = `category-more-${index}`;

  return `
    <section class="template-category">

      <div class="template-category-heading">
        <h2>${escapeHtml(category)}</h2>
      </div>

      <div
        class="grid grid-3"
        style="width:100%;"
      >
        ${first.map(templateCard).join("")}
      </div>

      ${
        rest.length
          ? `
            <div
              id="${moreId}"
              class="grid grid-3 template-category-more"
              style="width:100%;"
              hidden
            >
              ${rest.map(templateCard).join("")}
            </div>

            <div class="template-see-more">
              <button
                type="button"
                class="btn btn-outline see-more-btn"
                data-target="${moreId}"
                data-count="${rest.length}"
                aria-expanded="false"
              >
                See More (${rest.length})
              </button>
            </div>
          `
          : ""
      }

    </section>
  `;
}

function bindSeeMore() {
  document.querySelectorAll(".see-more-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const target = document.getElementById(targetId);

      if (!target) return;

      const isHidden = target.hasAttribute("hidden");

      if (isHidden) {
        target.removeAttribute("hidden");
        button.setAttribute("aria-expanded", "true");
        button.textContent = "See Less";
      } else {
        target.setAttribute("hidden", "");
        button.setAttribute("aria-expanded", "false");
        button.textContent = `See More (${button.dataset.count})`;
      }
    });
  });
}

async function loadTemplates() {
  const mount = document.getElementById("templates-grid");

  if (!mount) {
    console.error("templates-grid element was not found.");
    return;
  }

  // The marketplace container must hold full-width category sections.
  // If templates.html has old grid classes on #templates-grid, remove them
  // so each category is not squeezed into one-third of the page.
  mount.classList.remove("grid", "grid-2", "grid-3");

  renderLoadingGrid(mount, 6);

  try {
    const q = query(
      collection(db, "templates"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      renderEmptyState(
        mount,
        "New templates are coming soon",
        "The Code by Me marketplace is being stocked with real, ready-made templates. Check back soon."
      );
      return;
    }

    const templates = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    const sections = CATEGORIES
      .map((category, index) =>
        categorySection(
          category,
          templates.filter(
            (t) =>
              String(t.category || "")
                .trim()
                .toLowerCase() === category.toLowerCase()
          ),
          index
        )
      )
      .filter(Boolean);

    const uncategorized = templates.filter(
      (t) =>
        !CATEGORIES.some(
          (category) =>
            String(t.category || "")
              .trim()
              .toLowerCase() === category.toLowerCase()
        )
    );

    if (uncategorized.length) {
      sections.push(
        categorySection(
          "Other Templates",
          uncategorized,
          999
        )
      );
    }

    mount.innerHTML = sections.length
      ? sections.join("")
      : `
        <div class="state-block">
          <h3>No template categories available</h3>
          <p>
            Add a category to your active templates from the CBM Admin Dashboard.
          </p>
        </div>
      `;

    bindSeeMore();
  } catch (err) {
    console.error("Failed to load templates:", err);
    renderErrorState(mount);
  }
}

loadTemplates();
