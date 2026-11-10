const SOURCE = "screenOverlaySource";
const USER_SOURCES = "screenOverlayUserSources";
export const SCREEN_OVERLAY_USER_MENU = "screenOverlayUsers";
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
  game.settings.register(moduleId, USER_SOURCES, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: updateSource,
  });
  registerUserMenu(moduleId);

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
    updateSource();
  });
  Hooks.on("collapseSidebar", (sidebar, collapsed) => {
    if (sidebar === ui.sidebar) updateVisibility(!collapsed);
  });
  Hooks.on("renderSidebar", sidebar => {
    if (sidebar === ui.sidebar) updateVisibility(sidebar.expanded);
  });

  function updateSource() {
    if (!ready) return;
    const assignments = game.settings.get(moduleId, USER_SOURCES);
    const source = parseMedia(assignments[game.user.id]) ?? parseMedia(game.settings.get(moduleId, SOURCE));
    if (source && media?.src === source.url.href) return;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video = undefined;
    }
    media?.remove();
    media = undefined;
    if (!source) {
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

    media = document.createElement(source.isVideo ? "video" : "img");
    if (source.isVideo) {
      video = media;
      Object.assign(video, { muted: true, loop: true, playsInline: true, preload: "none" });
    } else {
      media.alt = "";
    }
    media.addEventListener("error", event => { event.currentTarget.hidden = true; }, { once: true });
    media.src = source.url.href;
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

function registerUserMenu(moduleId) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  const title = `${TEXT}.Users.Name`;
  const icon = "fa-solid fa-images";

  class ScreenOverlayUsers extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "churas-screen-overlay-users",
      tag: "form",
      window: { title, icon, resizable: true },
      position: { width: 520 },
      form: { handler: ScreenOverlayUsers.save },
    };

    static PARTS = { content: { template: `modules/${moduleId}/templates/screen-overlay-users.hbs` } };

    #original;

    _canRender(options) {
      if (!game.user.isGM) return false;
      return super._canRender(options);
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const assignments = game.settings.get(moduleId, USER_SOURCES);
      this.#original = new Map();
      const users = game.users.map(user => {
        const file = assignments[user.id] ?? "";
        this.#original.set(user.id, file);
        return { id: user.id, name: user.name, file };
      });
      return { ...context, users };
    }

    static async save(_event, _form, formData) {
      if (!game.user.isGM) return;
      const assignments = { ...game.settings.get(moduleId, USER_SOURCES) };
      let changed = false;
      for (const [id, original] of this.#original) {
        const file = formData.object[id]?.trim();
        if (file === undefined || file === original || !game.users.has(id)) continue;
        if (file && !parseMedia(file)) {
          const message = game.i18n.format(`${TEXT}.Users.InvalidFile`, { name: game.users.get(id).name });
          ui.notifications.error(message);
          return;
        }
        if (file) assignments[id] = file;
        else delete assignments[id];
        changed = true;
      }
      if (changed) await game.settings.set(moduleId, USER_SOURCES, assignments);
      await this.close();
    }
  }

  game.settings.registerMenu(moduleId, SCREEN_OVERLAY_USER_MENU, {
    name: title,
    label: `${TEXT}.Users.Label`,
    hint: `${TEXT}.Users.Hint`,
    icon,
    type: ScreenOverlayUsers,
    restricted: true,
  });
}

function parseMedia(path) {
  if (typeof path !== "string" || !path.trim()) return null;
  const url = URL.parse(path.trim(), document.baseURI);
  if (!url || !["http:", "https:"].includes(url.protocol)) return null;
  const extension = url.pathname.split(".").pop().toLowerCase();
  const isVideo = Object.hasOwn(CONST.VIDEO_FILE_EXTENSIONS, extension);
  if (isVideo || Object.hasOwn(CONST.IMAGE_FILE_EXTENSIONS, extension)) return { url, isVideo };
  return null;
}
