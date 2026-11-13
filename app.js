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
const defaultPage = pages.find(
  (page) => page.id === (embedded ? "start" : "installation"),
);

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
  const chosen = pages.find((page) => page.id === id) || defaultPage;
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
  const showCommunity = chosen.id === "start" && !embedded;
  document.querySelector(".community").hidden = !showCommunity;
  document
    .querySelector(".content")
    .classList.toggle("has-community", showCommunity);
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
const communityCards = [...document.querySelectorAll("[data-community]")];
const communitySwitch = document.querySelector("#community-switch");
let switchingCommunity = false;

communitySwitch.addEventListener("click", () => {
  if (switchingCommunity) return;
  switchingCommunity = true;
  communitySwitch.setAttribute("aria-disabled", "true");
  const front = communityCards.find((card) =>
    card.classList.contains("is-front"),
  );
  const back = communityCards.find((card) => card !== front);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  front.classList.add("is-leaving");
  window.setTimeout(
    () => {
      front.classList.replace("is-front", "is-back");
      back.classList.replace("is-back", "is-front");
      front.inert = true;
      front.setAttribute("aria-hidden", "true");
      back.inert = false;
      back.removeAttribute("aria-hidden");
      document.querySelector("#community-current").textContent =
        back.querySelector("h3").textContent;
      communitySwitch.setAttribute(
        "aria-label",
        `Switch server: show ${front.querySelector("h3").textContent} on top`,
      );
      front.classList.remove("is-leaving");
      window.setTimeout(
        () => {
          switchingCommunity = false;
          communitySwitch.removeAttribute("aria-disabled");
        },
        reducedMotion ? 0 : 320,
      );
    },
    reducedMotion ? 0 : 300,
  );
});

async function loadCommunity(card) {
  const presence = card.querySelector(".discord-presence");
  try {
    const response = await fetch(
      `https://discord.com/api/guilds/${card.dataset.community}/widget.json?v=${Math.floor(Date.now() / 300000)}`,
      {
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Discord widget unavailable");
    const data = await response.json();
    presence.textContent = `${Number.isFinite(data.presence_count) ? data.presence_count : 0} members online`;
    presence.classList.add("is-online");
    const list = card.querySelector("ul");
    for (const member of (Array.isArray(data.members)
      ? data.members
      : []
    ).slice(0, 6)) {
      const item = document.createElement("li");
      const avatar = document.createElement("img");
      avatar.alt = "";
      avatar.width = avatar.height = 28;
      avatar.loading = "lazy";
      try {
        const url = new URL(member.avatar_url);
        if (
          url.protocol === "https:" &&
          ["cdn.discordapp.com", "cdn.discordapp.net"].includes(url.hostname)
        )
          avatar.src = url.href;
      } catch {
        /* Keep the avatar space when Discord omits an image. */
      }
      const name = document.createElement("span");
      name.textContent = member.username || "Discord member";
      item.append(avatar, name);
      list.append(item);
    }
    if (data.instant_invite) {
      const invite = new URL(data.instant_invite);
      if (
        invite.protocol === "https:" &&
        ["discord.com", "discord.gg"].includes(invite.hostname)
      )
        card.querySelector(".discord-footer a").href = invite.href;
    }
  } catch {
    presence.textContent =
      "Online list unavailable. You're still welcome to join.";
  }
}

if (!embedded) communityCards.forEach(loadCommunity);
if (!embedded && !location.hash) {
  window.history.replaceState(null, "", "#installation");
}
showPage(decodeURIComponent(location.hash.slice(1)));
