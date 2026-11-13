"use strict";

const pages = [...document.querySelectorAll("[data-page]")];
const links = [...document.querySelectorAll("[data-link]")];
const search = document.querySelector("#search");
const results = document.querySelector("#search-results");
const noResults = document.querySelector("#no-results");
const menuButton = document.querySelector("#menu-button");
const sidebar = document.querySelector("#sidebar");
const navGroups = [...sidebar.querySelectorAll("[data-nav-group]")];
const embedded = window.parent !== window;
const pageTitleSuffix = embedded ? "Guide & help" : "Coffee Client Wiki";

if (embedded) {
  document.documentElement.dataset.embedded = "true";
  document.querySelector(".topbar-label").textContent = "Guide & help";
  sidebar.setAttribute("aria-label", "Guide navigation");
}

function setOpenGroup(groupToOpen) {
  for (const group of navGroups) {
    const open = group === groupToOpen;
    group
      .querySelector("[data-nav-toggle]")
      .setAttribute("aria-expanded", String(open));
    group.querySelector("[data-nav-panel]").hidden = !open;
  }
}

for (const group of navGroups) {
  group.querySelector("[data-nav-toggle]").addEventListener("click", () => {
    const isOpen =
      group.querySelector("[data-nav-toggle]").getAttribute("aria-expanded") ===
      "true";
    setOpenGroup(isOpen ? null : group);
  });
}

function showPage(id) {
  const chosen = pages.find((page) => page.id === id) || pages[0];
  for (const page of pages) page.hidden = page !== chosen;
  for (const link of links) {
    const active = link.getAttribute("href") === `#${chosen.id}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const activeNavLink = sidebar.querySelector(
    `.nav-link[href="#${chosen.id}"]`,
  );
  if (activeNavLink) setOpenGroup(activeNavLink.closest("[data-nav-group]"));
  document.title = `${chosen.dataset.title} | ${pageTitleSuffix}`;
  sidebar.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}

function findPages(query) {
  const term = query.trim().toLocaleLowerCase();
  results.replaceChildren();
  results.hidden = !term;
  noResults.hidden = true;
  if (!term) return;

  const matches = pages
    .filter((page) =>
      `${page.dataset.title} ${page.dataset.keywords || ""} ${page.textContent}`
        .toLocaleLowerCase()
        .includes(term),
    )
    .sort((a, b) => {
      const rank = (page) =>
        page.dataset.title.toLocaleLowerCase().includes(term)
          ? 0
          : (page.dataset.keywords || "").toLocaleLowerCase().includes(term)
            ? 1
            : 2;
      return rank(a) - rank(b);
    });
  noResults.hidden = matches.length > 0;
  for (const page of matches) {
    const link = document.createElement("a");
    link.href = `#${page.id}`;
    link.className = "result-link";
    const title = document.createElement("strong");
    title.textContent = page.dataset.title;
    const detail = document.createElement("span");
    detail.textContent = page.dataset.summary || "";
    link.append(title, detail);
    results.append(link);
  }
}

window.addEventListener("hashchange", () =>
  showPage(decodeURIComponent(location.hash.slice(1))),
);
window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });
search.addEventListener("input", () => findPages(search.value));
search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const first = results.querySelector("a");
    if (first) first.click();
  }
  if (event.key === "Escape") {
    search.value = "";
    findPages("");
  }
});
results.addEventListener("click", () => {
  search.value = "";
  findPages("");
});
menuButton.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && window.parent !== window) {
    window.parent.postMessage({ type: "coffee-wiki-close" }, "*");
  }
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    search.focus();
  }
});
showPage(decodeURIComponent(location.hash.slice(1)));
