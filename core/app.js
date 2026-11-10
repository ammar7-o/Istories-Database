(() => {
  "use strict";

  const DATA =
    window.ISTORIES_FILES && typeof window.ISTORIES_FILES === "object"
      ? window.ISTORIES_FILES
      : null;
  const FILES = DATA && Array.isArray(DATA.files) ? DATA.files : [];
  const FOLDER_ENTRIES =
    DATA && Array.isArray(DATA.folders) ? DATA.folders : [];
  const DEFAULT_BASE_URL = "https://ammar7-o.github.io/Istories-Database/";
  const BASE_URL = (() => {
    const value =
      DATA && typeof DATA.baseUrl === "string" ? DATA.baseUrl.trim() : "";
    const base = value || DEFAULT_BASE_URL;
    return base.endsWith("/") ? base : `${base}/`;
  })();

  const ICONS = {
    folder:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1l1.7 2h8.2A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/></svg>',
    file:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3h7l4 4v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M13.5 3v4h4"/></svg>',
    copy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  };

  const IMAGE_EXTS = new Set([
    "avif",
    "bmp",
    "gif",
    "ico",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp",
  ]);
  const JS_EXTS = new Set(["js", "mjs", "cjs"]);

  const $ = (id) => document.getElementById(id);

  const searchInput = $("search");
  const clearSearchBtn = $("clear-search");
  const brandStats = $("brand-stats");
  const backBtn = $("back");
  const breadcrumbsEl = $("breadcrumbs");
  const itemCountEl = $("item-count");
  const titleIconEl = $("title-icon");
  const folderTitleEl = $("folder-title");
  const folderSubtitleEl = $("folder-subtitle");
  const listingEl = $("listing");
  const manifestMetaEl = $("manifest-meta");
  const toastEl = $("toast");

  const rootName =
    DATA && DATA.rootName
      ? String(DATA.rootName).replace(/[-_]+/g, " ")
      : "Project";

  const root = {
    type: "folder",
    name: rootName,
    path: "",
    children: [],
  };
  const folderByPath = new Map([["", root]]);
  const fileByPath = new Map();
  const cardByPath = new Map();
  const copyOriginals = new WeakMap();
  const copyTimers = new WeakMap();

  const state = {
    currentPath: "",
    search: "",
    selectedPath: null,
  };

  let toastTimer = null;

  /* ---------- Tree building ---------- */

  function ensureFolder(parts) {
    let parent = root;
    let path = "";

    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      let folder = folderByPath.get(path);

      if (!folder) {
        folder = {
          type: "folder",
          name: part,
          path,
          children: [],
        };
        folderByPath.set(path, folder);
        parent.children.push(folder);
      }

      parent = folder;
    }

    return parent;
  }

  for (const file of FILES) {
    if (!file || typeof file.path !== "string") continue;

    const parts = file.path.split("/").filter(Boolean);
    if (!parts.length) continue;

    const parent = ensureFolder(parts.slice(0, -1));
    const node = {
      ...file,
      type: "file",
      name: file.name || parts[parts.length - 1] || file.path,
    };

    parent.children.push(node);
    fileByPath.set(node.path, node);
  }

  for (const folder of FOLDER_ENTRIES) {
    if (!folder || typeof folder.path !== "string") continue;
    const parts = folder.path.split("/").filter(Boolean);
    if (parts.length) ensureFolder(parts);
  }

  function sortFolder(folder) {
    folder.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    for (const child of folder.children) {
      if (child.type === "folder") sortFolder(child);
    }
  }

  sortFolder(root);

  /* ---------- Helpers ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function plural(count, word) {
    return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
  }

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes < 1024) return `${bytes} B`;

    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }

    const rounded =
      value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "");
    return `${rounded} ${units[unit]}`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function isJs(file) {
    return JS_EXTS.has((file.ext || "").toLowerCase());
  }

  function fileClass(file) {
    const ext = (file.ext || "").toLowerCase();
    if (IMAGE_EXTS.has(ext)) return "img";
    return ext || "file";
  }

  function parentPath(path) {
    const index = path.lastIndexOf("/");
    return index === -1 ? "" : path.slice(0, index);
  }

  function fullUrl(path) {
    return (
      BASE_URL +
      path
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/")
    );
  }

  function appendHighlighted(parent, text, term) {
    if (!term) {
      parent.textContent = text;
      return;
    }

    const lower = text.toLowerCase();
    let cursor = 0;
    let index = lower.indexOf(term);

    while (index !== -1) {
      if (index > cursor) {
        parent.append(document.createTextNode(text.slice(cursor, index)));
      }

      const mark = document.createElement("mark");
      mark.textContent = text.slice(index, index + term.length);
      parent.append(mark);
      cursor = index + term.length;
      index = lower.indexOf(term, cursor);
    }

    if (cursor < text.length) {
      parent.append(document.createTextNode(text.slice(cursor)));
    }
  }

  /* ---------- Hash routing ---------- */

  function hashFor(path) {
    if (!path) return "#/";
    return `#/${path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/")}`;
  }

  function pathFromHash() {
    const raw = window.location.hash.replace(/^#\/?/, "");
    if (!raw) return "";

    try {
      const path = raw
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent)
        .join("/");
      return folderByPath.has(path) ? path : "";
    } catch (_) {
      return "";
    }
  }

  function navigateTo(path) {
    const target = folderByPath.has(path) ? path : "";
    state.currentPath = target;
    state.selectedPath = null;
    state.search = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");

    const hash = hashFor(target);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }

    render();
  }

  function onHashChange() {
    const target = pathFromHash();
    if (target === state.currentPath && !state.search.trim()) return;

    state.currentPath = target;
    state.selectedPath = null;
    state.search = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    render();
  }

  /* ---------- Rendering ---------- */

  function render() {
    cardByPath.clear();

    const term = state.search.trim().toLowerCase();
    if (term) {
      renderSearch(term);
    } else {
      renderFolder(state.currentPath);
    }

    const canGoBack = Boolean(term) || Boolean(state.currentPath);
    backBtn.disabled = !canGoBack;
    backBtn.title = term
      ? "Back to folder"
      : canGoBack
        ? "Back to parent folder"
        : "Back";
    backBtn.setAttribute("aria-label", backBtn.title);
  }

  function setTitle(title, subtitle, iconName) {
    folderTitleEl.textContent = title;
    folderTitleEl.title = title;
    folderSubtitleEl.textContent = subtitle;
    titleIconEl.className = `title-icon${iconName === "search" ? " search" : ""}`;
    titleIconEl.innerHTML = ICONS[iconName] || ICONS.folder;
  }

  function describeFolder(folder) {
    let folders = 0;
    let files = 0;

    for (const child of folder.children) {
      if (child.type === "folder") folders += 1;
      else files += 1;
    }

    const parts = [];
    if (folders) parts.push(plural(folders, "folder"));
    if (files) parts.push(plural(files, "file"));
    return parts.length ? parts.join(" · ") : "Empty folder";
  }

  function renderFolder(path) {
    const folder = folderByPath.get(path) || root;

    renderBreadcrumbs(folder.path, false);
    setTitle(folder.name || rootName, describeFolder(folder), "folder");
    itemCountEl.textContent = plural(folder.children.length, "item");
    listingEl.replaceChildren();

    if (!folder.children.length) {
      listingEl.append(
        emptyState(
          "folder",
          path ? "This folder is empty" : "Nothing here yet",
          path
            ? "Add files to this folder, then run ./tree.sh to refresh the tree."
            : "Add some folders or files, then run ./tree.sh to build the tree."
        )
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of folder.children) {
      fragment.append(renderCard(item, "", false));
    }
    listingEl.append(fragment);
  }

  function renderSearch(term) {
    const results = [];

    for (const folder of folderByPath.values()) {
      if (folder.path && folder.path.toLowerCase().includes(term)) {
        results.push(folder);
      }
    }

    for (const file of fileByPath.values()) {
      if (file.path.toLowerCase().includes(term)) {
        results.push(file);
      }
    }

    results.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.path.localeCompare(b.path, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    renderBreadcrumbs("", true);
    setTitle(
      "Search results",
      `${plural(results.length, "result")} for “${state.search.trim()}”`,
      "search"
    );
    itemCountEl.textContent = plural(results.length, "result");
    listingEl.replaceChildren();

    if (!results.length) {
      listingEl.append(
        emptyState(
          "search",
          "No matches",
          `Nothing matches “${state.search.trim()}”. Try a different search.`,
          "Clear search",
          () => clearSearch(true)
        )
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of results) {
      fragment.append(renderCard(item, term, true));
    }
    listingEl.append(fragment);
  }

  function renderCard(item, term, showPath) {
    const isFolder = item.type === "folder";
    const card = el(
      "article",
      `item-card ${isFolder ? "folder-card" : "file-card"}${
        !isFolder && state.selectedPath === item.path ? " selected" : ""
      }`
    );

    card.tabIndex = 0;
    card.setAttribute("role", "listitem");
    card.setAttribute(
      "aria-label",
      isFolder ? `Folder ${item.name}` : `File ${item.name}`
    );
    card.dataset.path = item.path;
    card.title = isFolder ? `Open ${item.path}` : item.path;
    cardByPath.set(item.path, card);

    const top = el("div", "item-top");
    const icon = el(
      "div",
      `item-icon ${isFolder ? "folder" : fileClass(item)}`
    );
    icon.innerHTML = isFolder ? ICONS.folder : ICONS.file;
    icon.setAttribute("aria-hidden", "true");
    top.append(icon);

    if (!isFolder && isJs(item)) {
      const copyButton = el("button", "copy-btn");
      const url = fullUrl(item.path);
      copyButton.type = "button";
      copyButton.innerHTML = `${ICONS.copy}<span class="copy-label">Copy URL</span>`;
      copyButton.title = `Copy URL: ${url}`;
      copyButton.setAttribute("aria-label", `Copy URL ${url}`);
      copyButton.addEventListener("click", (event) => {
        event.stopPropagation();
        copyFileUrl(item, copyButton);
      });
      top.append(copyButton);
    }

    card.append(top);

    const info = el("div", "item-info");
    const name = el("h3", "item-name");
    appendHighlighted(name, item.name, term);
    info.append(name);

    const meta = el("p", "item-meta");
    if (isFolder) {
      meta.textContent = item.children.length
        ? plural(item.children.length, "item")
        : "Empty folder";
    } else {
      meta.textContent = [formatSize(item.size), formatDate(item.mtime)]
        .filter(Boolean)
        .join(" · ");
    }
    info.append(meta);

    if (showPath) {
      const pathLine = el("p", "item-path");
      const pathText = isFolder
        ? item.path
        : parentPath(item.path) || rootName;
      appendHighlighted(pathLine, pathText, term);
      pathLine.title = pathText;
      info.append(pathLine);
    }

    card.append(info);

    if (isFolder) {
      const open = () => navigateTo(item.path);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    } else {
      const select = () => selectFile(item);
      card.addEventListener("click", select);
      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    }

    return card;
  }

  function renderBreadcrumbs(path, searching) {
    breadcrumbsEl.replaceChildren();

    const atRoot = !path && !searching;
    breadcrumbsEl.append(makeCrumb(rootName, "", atRoot, true));

    if (!searching) {
      let prefix = "";
      for (const part of path.split("/").filter(Boolean)) {
        prefix = prefix ? `${prefix}/${part}` : part;
        breadcrumbsEl.append(separator());
        const current = prefix === path;
        const label = folderByPath.get(prefix)?.name || part;
        breadcrumbsEl.append(makeCrumb(label, prefix, current, false));
      }
    } else {
      breadcrumbsEl.append(separator());
      const current = el("span", "crumb current", "Search results");
      current.setAttribute("aria-current", "page");
      breadcrumbsEl.append(current);
    }
  }

  function makeCrumb(label, path, current, isHome) {
    const node = current
      ? el("span", "crumb current")
      : el("button", "crumb crumb-btn");

    if (!current) {
      node.type = "button";
      node.title = path ? `Open ${path}` : "Open project root";
      node.addEventListener("click", () => navigateTo(path));
    }

    if (isHome) {
      const icon = el("span", "crumb-icon");
      icon.innerHTML = ICONS.home;
      icon.setAttribute("aria-hidden", "true");
      node.append(icon);
      node.classList.add("home");
    }

    node.append(el("span", "crumb-label", label));

    if (current) node.setAttribute("aria-current", "page");
    return node;
  }

  function separator() {
    const node = el("span", "crumb-sep");
    node.innerHTML = ICONS.chevron;
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function emptyState(iconName, title, message, actionLabel, action) {
    const wrapper = el("div", "empty-state");
    const icon = el("div", "empty-icon");
    icon.innerHTML = ICONS[iconName] || ICONS.folder;
    icon.setAttribute("aria-hidden", "true");
    wrapper.append(icon, el("h3", "", title), el("p", "", message));

    if (actionLabel && action) {
      const button = el("button", "btn", actionLabel);
      button.type = "button";
      button.addEventListener("click", action);
      wrapper.append(button);
    }

    return wrapper;
  }

  /* ---------- Selection ---------- */

  function selectFile(file) {
    state.selectedPath = file.path;

    const previous = listingEl.querySelector(".file-card.selected");
    if (previous) previous.classList.remove("selected");

    const card = cardByPath.get(file.path);
    if (card) card.classList.add("selected");
  }

  function clearSelection() {
    state.selectedPath = null;
    const selected = listingEl.querySelector(".file-card.selected");
    if (selected) selected.classList.remove("selected");
  }

  /* ---------- Clipboard ---------- */

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      /* Fall back to execCommand below. */
    }

    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.left = "-1000px";
      area.style.opacity = "0";
      document.body.appendChild(area);

      try {
        area.select();
        area.setSelectionRange(0, area.value.length);
        return document.execCommand("copy");
      } finally {
        area.remove();
      }
    } catch (_) {
      return false;
    }
  }

  async function copyFileUrl(file, button) {
    const url = fullUrl(file.path);
    const copied = await copyText(url);

    if (!copied) {
      showToast("Couldn't copy — clipboard access was blocked");
      return;
    }

    if (button) flashCopied(button);
    showToast(`Copied ${url}`);
  }

  function flashCopied(button) {
    const running = copyTimers.get(button);
    if (running) clearTimeout(running);

    if (!copyOriginals.has(button)) {
      copyOriginals.set(button, button.innerHTML);
    }

    button.classList.add("copied");
    button.innerHTML = `${ICONS.check}<span class="copy-label">Copied</span>`;

    const timer = setTimeout(() => {
      button.classList.remove("copied");
      button.innerHTML = copyOriginals.get(button);
    }, 1400);

    copyTimers.set(button, timer);
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2400);
  }

  /* ---------- Search ---------- */

  function clearSearch(focus) {
    searchInput.value = "";
    state.search = "";
    state.selectedPath = null;
    clearSearchBtn.classList.add("hidden");
    render();
    if (focus) searchInput.focus();
  }

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value;
    state.selectedPath = null;
    clearSearchBtn.classList.toggle("hidden", !state.search.trim());
    render();
  });

  clearSearchBtn.addEventListener("click", () => clearSearch(true));

  backBtn.addEventListener("click", () => {
    if (state.search.trim()) {
      clearSearch(true);
      return;
    }

    if (state.currentPath) {
      navigateTo(parentPath(state.currentPath));
    }
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);

    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (event.key !== "Escape") return;

    if (state.search.trim()) {
      clearSearch(true);
      return;
    }

    if (state.selectedPath) clearSelection();
  });

  /* ---------- Init ---------- */

  brandStats.textContent = DATA
    ? `${plural(FILES.length, "file")} · ${plural(
        Math.max(0, folderByPath.size - 1),
        "folder"
      )}`
    : "Manifest missing";

  if (DATA && DATA.generatedAt) {
    const generated = new Date(DATA.generatedAt);
    if (!Number.isNaN(generated.getTime())) {
      manifestMetaEl.textContent = `Manifest · ${generated.toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" }
      )}`;
    }
  } else {
    manifestMetaEl.textContent = "Manifest missing";
  }

  manifestMetaEl.title = "Run ./tree.sh to refresh the tree";

  state.currentPath = pathFromHash();
  window.addEventListener("hashchange", onHashChange);
  render();
})();
