const SOURCE = "screenOverlaySource";
const WIDTH = "screenOverlayWidth";
const X = "screenOverlayX";
const Y = "screenOverlayY";
const TEXT = "CHURAS_LITTLE_FIXES.ScreenOverlay";
const DIMENSIONS = [
  { key: WIDTH, label: "Width", property: "--overlay-width", min: 1, default: 15 },
  { key: X, label: "X", property: "--overlay-x", min: 0, default: 50 },
  { key: Y, label: "Y", property: "--overlay-y", min: 0, default: 15 },
];

export const SCREEN_OVERLAY_SETTINGS = [SOURCE, ...DIMENSIONS.map(({ key }) => key)];

export function registerScreenOverlay(moduleId) {
  let layer;
  let media;
  let video;
  let ready = false;

  game.settings.register(moduleId, SOURCE, {
    name: `${TEXT}.Source.Name`,
    hint: `${TEXT}.Source.Hint`,
    scope: "world",
    config: true,
    type: new foundry.data.fields.FilePathField({ categories: ["IMAGE", "VIDEO"], blank: true }),
    default: "",
    onChange: updateSource,
  });

  for (const { key, label, min, default: initial } of DIMENSIONS) {
    game.settings.register(moduleId, key, {
      name: `${TEXT}.${label}.Name`,
      hint: `${TEXT}.${label}.Hint`,
      scope: "world",
      config: true,
      type: Number,
      range: { min, max: 100, step: 1 },
      default: initial,
      onChange: updatePosition,
    });
  }

  Hooks.once("ready", () => {
    ready = true;
    updateSource(game.settings.get(moduleId, SOURCE));
  });
  Hooks.on("collapseSidebar", (sidebar, collapsed) => {
    if (sidebar === ui.sidebar) updateVisibility(!collapsed);
  });
  Hooks.on("renderSidebar", sidebar => {
    if (sidebar === ui.sidebar) updateVisibility(sidebar.expanded);
  });

  function updateSource(path) {
    if (!ready) return;
    const url = path?.trim() && URL.parse(path.trim(), document.baseURI);
    const extension = url && url.pathname.split(".").pop().toLowerCase();
    const isVideo = extension && Object.hasOwn(CONST.VIDEO_FILE_EXTENSIONS, extension);
    const isImage = extension && Object.hasOwn(CONST.IMAGE_FILE_EXTENSIONS, extension);
    const supported = url && ["http:", "https:"].includes(url.protocol) && (isVideo || isImage);
    if (supported && media?.src === url.href) return;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video = undefined;
    }
    media?.remove();
    media = undefined;
    if (!supported) {
      layer?.remove();
      layer = undefined;
      return;
    }

    if (!layer) {
      layer = document.createElement("div");
      layer.className = "churas-screen-overlay";
      layer.setAttribute("aria-hidden", "true");
      layer.inert = true;
      layer.hidden = true;
      document.body.append(layer);
    }

    media = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      video = media;
      Object.assign(video, { muted: true, loop: true, playsInline: true, preload: "none" });
    } else {
      media.alt = "";
    }
    media.addEventListener("error", event => { event.currentTarget.hidden = true; }, { once: true });
    media.src = url.href;
    layer.append(media);
    updatePosition();
    updateVisibility(ui.sidebar?.expanded);
  }

  function updatePosition() {
    if (!layer) return;
    for (const { key, property, min, default: initial } of DIMENSIONS) {
      const value = game.settings.get(moduleId, key);
      const percent = Number.isFinite(value) ? Math.min(100, Math.max(min, value)) : initial;
      layer.style.setProperty(property, `${percent}%`);
    }
  }

  function updateVisibility(expanded) {
    if (!layer) return;
    layer.hidden = !expanded;
    if (!video) return;
    if (!expanded) video.pause();
    else if (video.paused) video.play().catch(() => {});
  }
}
