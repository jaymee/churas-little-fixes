const VIDEO_FLAG = "canvasEffectVideo";
const SHAKE_FLAG = "canvasEffectShake";
const TEXT = "CHURAS_LITTLE_FIXES.CanvasEffects";
const START_DELAY = 400;
const SHAKE_DURATION = 700;

export function registerCanvasEffects(moduleId) {
  if (game.release.generation !== 13) return;

  let video;
  let videoKey;
  let videoStart;
  let videoEnd;
  let shakeKey;
  let shakeStart;
  let shake;
  const localize = key => game.i18n.localize(`${TEXT}.${key}`);

  Hooks.on("canvasReady", () => syncEffects(canvas.scene));
  Hooks.on("updateScene", scene => {
    if (canvas?.ready && canvas.scene?.id === scene.id) syncEffects(scene);
  });
  Hooks.on("canvasTearDown", () => {
    stopVideo();
    stopShake();
    videoKey = shakeKey = undefined;
  });

  Hooks.on("renderSceneControls", (_app, html) => {
    if (!game.user.isGM) return;
    const menu = html.querySelector("#scene-controls-controls")
      ?? html.querySelector('[data-control="tokens"]')?.closest("menu, ol, ul");
    if (!menu || menu.querySelector("[data-churas-canvas-effects]")) return;
    const entry = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-control icon fa-solid fa-film";
    button.dataset.churasCanvasEffects = "";
    button.dataset.tooltip = localize("Title");
    button.setAttribute("aria-label", localize("Title"));
    button.addEventListener("click", () => {
      if (panel.rendered) panel.bringToFront();
      else panel.render({ force: true });
    });
    entry.append(button);
    menu.append(entry);
  });

  const panel = createControls(moduleId, localize);

  function syncEffects(scene) {
    const board = canvas.app?.view;
    if (!scene || !board) return;

    const videoState = scene.getFlag(moduleId, VIDEO_FLAG);
    const nextVideo = videoState ? `${scene.id}:${videoState.startedAt}:${videoState.src}` : undefined;
    if (nextVideo !== videoKey) {
      stopVideo();
      videoKey = nextVideo;
      const src = webmUrl(videoState?.src);
      const remaining = timeRemaining(videoState);
      const canLoop = videoState?.loop === true && Number.isFinite(videoState.startedAt)
        && Number.isFinite(videoState.duration) && videoState.duration > 0;
      if (src && (remaining > 0 || canLoop)) playVideo(board, src, videoState, remaining);
    }

    const shakeState = scene.getFlag(moduleId, SHAKE_FLAG);
    const nextShake = shakeState ? `${scene.id}:${shakeState.startedAt}` : undefined;
    if (nextShake !== shakeKey) {
      stopShake();
      shakeKey = nextShake;
      if (timeRemaining(shakeState) > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        shakeStart = window.setTimeout(() => startShake(board, shakeState), Math.max(0, shakeState.startedAt - now()));
      }
    }
  }

  function playVideo(board, src, state, remaining) {
    const element = makeVideo();
    video = element;
    element.className = "churas-canvas-effect-video";
    element.style.zIndex = window.getComputedStyle(board).zIndex;
    element.setAttribute("aria-hidden", "true");
    element.hidden = true;
    element.loop = state.loop === true;

    const finish = () => {
      if (video === element) stopVideo();
    };
    if (!element.loop) element.addEventListener("ended", finish, { once: true });
    element.addEventListener("error", finish, { once: true });
    element.addEventListener("playing", () => { element.hidden = false; }, { once: true });
    element.addEventListener("loadedmetadata", () => {
      if (video !== element) return;
      videoStart = window.setTimeout(async () => {
        if (video !== element || (!element.loop && timeRemaining(state) <= 0)) return;
        try {
          const elapsed = Math.max(0, now() - state.startedAt);
          const offset = element.loop ? elapsed % state.duration : elapsed;
          element.currentTime = offset / 1000;
          await element.play();
        } catch {
          finish();
        }
      }, Math.max(0, state.startedAt - now()));
    }, { once: true });

    board.after(element);
    if (!element.loop) videoEnd = window.setTimeout(finish, remaining);
    element.preload = "auto";
    element.src = src;
  }

  function stopVideo() {
    window.clearTimeout(videoStart);
    window.clearTimeout(videoEnd);
    if (!video) return;
    const element = video;
    video = undefined;
    releaseVideo(element);
    element.remove();
  }

  function startShake(board, state) {
    const elapsed = Math.max(0, now() - state.startedAt);
    if (elapsed >= state.duration) return;
    const intensity = shakeIntensity(state.intensity) / 100;
    const offsets = [[0, 0], [-8, 4], [9, -5], [-7, -3], [6, 4], [-4, -2], [2, 1], [0, 0]];
    const frames = offsets.map(([x, y]) => ({ translate: `${x * intensity}px ${y * intensity}px` }));
    shake = board.animate(frames, { duration: state.duration });
    shake.currentTime = elapsed;
  }

  function stopShake() {
    window.clearTimeout(shakeStart);
    shake?.cancel();
    shake = undefined;
  }
}

function createControls(moduleId, localize) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  class CanvasEffectsControls extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "churas-canvas-effects",
      window: { title: `${TEXT}.Title`, icon: "fa-solid fa-film" },
      position: { width: 420 },
      actions: {
        browse: CanvasEffectsControls.browse,
        play: CanvasEffectsControls.play,
        stop: CanvasEffectsControls.stop,
        shake: CanvasEffectsControls.shake,
      },
    };

    static PARTS = { content: { template: `modules/${moduleId}/templates/canvas-effects.hbs` } };

    #request = 0;
    #intensity = 100;

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const video = canvas?.scene?.getFlag(moduleId, VIDEO_FLAG);
      return { ...context, source: video?.src ?? "", loop: video?.loop === true, intensity: this.#intensity };
    }

    static browse() {
      const field = this.element.querySelector("[data-effect-source]");
      const Picker = foundry.applications.apps.FilePicker.implementation;
      new Picker({ type: "video", current: field.value, callback: path => { field.value = path; } })
        .render({ force: true });
    }

    static async play() {
      const scene = getEditableScene();
      if (!scene) return;
      const src = this.element.querySelector("[data-effect-source]").value.trim();
      const url = webmUrl(src);
      if (!url) {
        ui.notifications.warn(localize("ChooseWebm"));
        return;
      }

      const request = ++this.#request;
      const loop = this.element.querySelector("[data-effect-loop]").checked;
      try {
        const duration = await readVideoDuration(url);
        if (this.#request !== request || canvas.scene !== scene || !canvas.ready) return;
        await scene.setFlag(moduleId, VIDEO_FLAG, { src, startedAt: now() + START_DELAY, duration, loop });
      } catch {
        if (this.#request === request) ui.notifications.error(localize("CannotPlay"));
      }
    }

    static async stop() {
      ++this.#request;
      const scene = getEditableScene();
      if (scene) await scene.unsetFlag(moduleId, VIDEO_FLAG);
    }

    static async shake() {
      const scene = getEditableScene();
      if (!scene) return;
      this.#intensity = shakeIntensity(this.element.querySelector("[data-shake-intensity]").valueAsNumber);
      await scene.setFlag(moduleId, SHAKE_FLAG, {
        startedAt: now() + START_DELAY,
        duration: SHAKE_DURATION,
        intensity: this.#intensity,
      });
    }
  }

  function getEditableScene() {
    const scene = canvas?.ready && canvas.scene;
    if (game.user.isGM && scene?.canUserModify(game.user, "update")) return scene;
    ui.notifications.warn(localize("NoScene"));
    return null;
  }

  return new CanvasEffectsControls();
}

function shakeIntensity(value) {
  return Number.isFinite(value) ? Math.min(200, Math.max(10, value)) : 100;
}

function webmUrl(src) {
  if (typeof src !== "string" || !src) return null;
  try {
    const url = new URL(src, document.baseURI);
    if ((url.protocol === "https:" || url.protocol === "http:") && /\.webm$/i.test(url.pathname)) return url.href;
  } catch {
    return null;
  }
  return null;
}

function now() {
  const time = game.time?.serverTime;
  return Number.isFinite(time) ? time : Date.now();
}

function timeRemaining(state) {
  if (!Number.isFinite(state?.startedAt) || !Number.isFinite(state.duration)) return 0;
  return state.startedAt + state.duration - now();
}

function makeVideo() {
  const video = document.createElement("video");
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  return video;
}

function releaseVideo(video) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function readVideoDuration(src) {
  const video = makeVideo();
  video.preload = "metadata";
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      const fail = () => reject(new Error("WebM metadata unavailable"));
      video.addEventListener("error", fail, { once: true });
      video.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(video.duration) && video.duration > 0) resolve(video.duration * 1000);
        else fail();
      }, { once: true });
      timer = window.setTimeout(fail, 10000);
      video.src = src;
    });
  } finally {
    window.clearTimeout(timer);
    releaseVideo(video);
  }
}
