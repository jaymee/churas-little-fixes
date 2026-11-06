const BROWSER_FAVICON = "browserFavicon";
const BROWSER_TITLE = "browserTitle";

export function registerBrowserTab(moduleId) {
  game.settings.register(moduleId, BROWSER_FAVICON, {
    name: "CHURAS_LITTLE_FIXES.BrowserFavicon.Name",
    hint: "CHURAS_LITTLE_FIXES.BrowserFavicon.Hint",
    scope: "world",
    config: true,
    type: new foundry.data.fields.FilePathField({ categories: ["IMAGE"], blank: true }),
    default: "",
    onChange: applyFavicon,
  });

  game.settings.register(moduleId, BROWSER_TITLE, {
    name: "CHURAS_LITTLE_FIXES.BrowserTitle.Name",
    hint: "CHURAS_LITTLE_FIXES.BrowserTitle.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: applyTitle,
  });

  Hooks.once("ready", () => {
    applyFavicon(game.settings.get(moduleId, BROWSER_FAVICON));
    applyTitle(game.settings.get(moduleId, BROWSER_TITLE));
  });
}

let originalTitle;

function applyTitle(value) {
  const title = value.trim();
  if (title) {
    originalTitle ??= document.title;
    document.title = title;
  } else if (originalTitle !== undefined) {
    document.title = originalTitle;
    originalTitle = undefined;
  }
}

let customIcon;
const originalRels = new Map();

function applyFavicon(path) {
  const url = path?.trim() && URL.parse(path.trim(), document.baseURI);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    customIcon?.remove();
    for (const [link, rel] of originalRels) link.rel = rel;
    originalRels.clear();
    return;
  }

  for (const link of document.head.querySelectorAll('link[rel~="icon"]')) {
    if (link === customIcon) continue;
    originalRels.set(link, link.rel);
    link.removeAttribute("rel");
  }

  customIcon ??= document.createElement("link");
  customIcon.rel = "icon";
  customIcon.href = url.href;
  if (!customIcon.isConnected) document.head.append(customIcon);
}
