const FLAG = "pinGlow";
const TEXT = "CHURAS_LITTLE_FIXES.PinGlow";
const DEFAULT_COLOR = "#ffce70";
const SIZE = { min: 100, max: 500, default: 220 };
const INTENSITY = { min: 0, max: 100, default: 70 };
const ANIMATION_SPEED = { min: 1, max: 10, default: 5 };
const ANIMATIONS = ["none", "pulse", "torch"];
const TAU = Math.PI * 2;

export function registerPinGlow(moduleId) {
  const glows = new WeakMap();
  const animated = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticker;
  let texture;

  Hooks.on("renderNoteConfig", (app, html) => {
    if (game.user.isGM) addGlowFields(app, html, moduleId);
  });
  Hooks.on("drawNote", drawGlow);
  Hooks.on("refreshNote", drawGlow);
  Hooks.on("updateNote", note => {
    if (note.object) drawGlow(note.object);
  });
  Hooks.on("deleteNote", stopAnimation);
  Hooks.on("canvasTearDown", () => {
    animated.clear();
    updateTicker();
  });
  reducedMotion.addEventListener("change", () => {
    updateTicker();
    for (const state of animated.values()) renderGlow(state, !reducedMotion.matches);
  });

  function drawGlow(note) {
    const config = note.document.getFlag(moduleId, FLAG);
    const icon = note.controlIcon;
    const iconSize = note.document.iconSize;
    const intensity = getPercent(config?.intensity, INTENSITY);
    const show = config?.enabled === true && intensity > 0 && icon?.parent === note
      && icon.visible && note.visible && note.isVisible && iconSize > 0;
    let glow = glows.get(note);
    if (!show) {
      if (glow && !glow.destroyed) glow.visible = false;
      stopAnimation(note.document);
      return;
    }

    if (!glow || glow.destroyed || glow.parent !== note) {
      if (glow && !glow.destroyed) glow.destroy();
      texture ??= createGlowTexture();
      glow = new PIXI.Sprite(texture);
      glow.anchor.set(0.5);
      glow.eventMode = "none";
      note.addChildAt(glow, note.getChildIndex(icon));
      glows.set(note, glow);
    }

    glow.visible = true;
    glow.tint = Number.parseInt(getColor(config.color).slice(1), 16);
    const animation = config.animation;
    const state = {
      glow,
      x: icon.x + iconSize / 2,
      y: icon.y + iconSize / 2,
      size: iconSize * getPercent(config.size, SIZE) / 100,
      alpha: intensity / 100,
      type: animationType(animation?.type),
      speed: getPercent(animation?.speed, ANIMATION_SPEED),
    };
    if (state.type !== "none") {
      animated.set(note.document, state);
      updateTicker();
      renderGlow(state, !reducedMotion.matches);
    } else {
      stopAnimation(note.document);
      renderGlow(state, false);
    }
  }

  function stopAnimation(document) {
    if (animated.delete(document)) updateTicker();
  }

  function updateTicker() {
    const next = animated.size && !reducedMotion.matches ? canvas?.app?.ticker : undefined;
    if (next === ticker) return;
    ticker?.remove(animate);
    ticker = next;
    ticker?.add(animate);
  }

  function animate() {
    const seconds = performance.now() / 1000;
    for (const [document, state] of animated) {
      if (state.glow.destroyed || state.glow.parent !== document.object) stopAnimation(document);
      else renderGlow(state, true, seconds);
    }
  }
}

function renderGlow(state, animate, seconds = performance.now() / 1000) {
  const { glow, type, speed, x, y } = state;
  let { size, alpha } = state;
  if (animate) {
    const phase = seconds * (0.25 + 0.125 * speed);
    if (type === "pulse") {
      const cycle = phase - Math.floor(phase);
      const strength = Math.min(cycle / 0.3, (1 - cycle) / 0.7);
      alpha *= 1 - 0.325 * (1 - strength);
      size *= 1 + 0.1 * strength;
    } else if (type === "torch") {
      const angle = TAU * phase;
      const flicker = 0.5 + 0.25 * Math.sin(angle) + 0.15 * Math.sin(1.7 * angle + 2)
        + 0.1 * Math.sin(2.3 * angle + 4);
      alpha *= 1 - 0.275 * flicker;
      size *= 1 - 0.1 * flicker;
    }
  }
  glow.alpha = alpha;
  glow.position.set(x, y);
  glow.width = glow.height = size;
}

function createGlowTexture() {
  const image = document.createElement("canvas");
  image.width = image.height = 128;
  const context = image.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.36, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.68, "rgba(255,255,255,0.32)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return PIXI.Texture.from(image);
}

function addGlowFields(app, html, moduleId) {
  const root = html.querySelector ? html : html[0];
  const labelField = root?.querySelector('[name="text"]')?.closest(".form-group");
  const prefix = `flags.${moduleId}.${FLAG}`;
  if (!app.document || !labelField || root.querySelector(`[name="${prefix}.enabled"]`)) return;

  const config = app.document.getFlag(moduleId, FLAG);
  const section = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = game.i18n.localize(`${TEXT}.Title`);
  section.append(legend);

  const fields = [
    { key: "enabled", type: "checkbox", checked: config?.enabled === true },
    { key: "color", type: "color", value: getColor(config?.color) },
    { key: "size", type: "number", value: getPercent(config?.size, SIZE), min: SIZE.min, max: SIZE.max },
    { key: "intensity", type: "number", value: getPercent(config?.intensity, INTENSITY), min: INTENSITY.min, max: INTENSITY.max },
    { key: "animation.type", choices: ANIMATIONS, value: animationType(config?.animation?.type) },
    { key: "animation.speed", type: "number", value: getPercent(config?.animation?.speed, ANIMATION_SPEED),
      min: ANIMATION_SPEED.min, max: ANIMATION_SPEED.max },
  ];
  for (const { key, choices, ...attributes } of fields) {
    const row = document.createElement("div");
    row.className = "form-group";
    const input = document.createElement(choices ? "select" : "input");
    if (choices) {
      for (const choice of choices) {
        const option = document.createElement("option");
        option.value = choice;
        option.textContent = game.i18n.localize(`${TEXT}.animations.${choice}`);
        input.append(option);
      }
    }
    Object.assign(input, attributes, { name: `${prefix}.${key}`, id: `${app.id}-pin-glow-${key.replace(".", "-")}` });
    if (input.type === "number") input.dataset.dtype = "Number";
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = game.i18n.localize(`${TEXT}.${key}`);
    const controls = document.createElement("div");
    controls.className = "form-fields";
    controls.append(input);
    row.append(label, controls);
    section.append(row);
  }
  labelField.after(section);
}

function animationType(value) {
  return ANIMATIONS.includes(value) ? value : "none";
}

function getColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_COLOR;
}

function getPercent(value, { min, max, default: fallback }) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
