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

  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user.isGM || !controls.tokens) return;
    controls.tokens.tools.churasCanvasEffects = {
      name: "churasCanvasEffects",
      title: `${TEXT}.Title`,
      icon: "fa-solid fa-film",
      button: true,
      onClick: () => panel.render({ force: true }),
    };
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
      if (src && remaining > 0) playVideo(board, src, videoState, remaining);
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

    const finish = () => {
      if (video === element) stopVideo();
    };
    element.addEventListener("ended", finish, { once: true });
    element.addEventListener("error", finish, { once: true });
    element.addEventListener("playing", () => { element.hidden = false; }, { once: true });
    element.addEventListener("loadedmetadata", () => {
      if (video !== element) return;
      videoStart = window.setTimeout(async () => {
        if (video !== element || timeRemaining(state) <= 0) return;
        try {
          element.currentTime = Math.max(0, now() - state.startedAt) / 1000;
          await element.play();
        } catch {
          finish();
        }
      }, Math.max(0, state.startedAt - now()));
    }, { once: true });

    board.after(element);
    videoEnd = window.setTimeout(finish, remaining);
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
    shake = board.animate([
      { translate: "0 0" },
      { translate: "-8px 4px" },
      { translate: "9px -5px" },
      { translate: "-7px -3px" },
      { translate: "6px 4px" },
      { translate: "-4px -2px" },
      { translate: "2px 1px" },
      { translate: "0 0" },
    ], { duration: state.duration });
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
      try {
        const duration = await readVideoDuration(url);
        if (this.#request !== request || canvas.scene !== scene || !canvas.ready) return;
        await scene.setFlag(moduleId, VIDEO_FLAG, { src, startedAt: now() + START_DELAY, duration });
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
      if (scene) await scene.setFlag(moduleId, SHAKE_FLAG, { startedAt: now() + START_DELAY, duration: SHAKE_DURATION });
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
