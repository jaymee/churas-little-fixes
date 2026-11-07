const FLAG = "pinGlow";
const TEXT = "CHURAS_LITTLE_FIXES.PinGlow";
const DEFAULT_COLOR = "#ffce70";
const SIZE = { min: 100, max: 400, default: 220 };
const INTENSITY = { min: 0, max: 100, default: 70 };

export function registerPinGlow(moduleId) {
  const glows = new WeakMap();
  let texture;

  Hooks.on("renderNoteConfig", (app, html) => {
    if (game.user.isGM) addGlowFields(app, html, moduleId);
  });
  Hooks.on("drawNote", drawGlow);
  Hooks.on("refreshNote", drawGlow);
  Hooks.on("updateNote", note => {
    if (note.object) drawGlow(note.object);
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
    glow.alpha = intensity / 100;
    glow.position.set(icon.x + iconSize / 2, icon.y + iconSize / 2);
    glow.width = glow.height = iconSize * getPercent(config.size, SIZE) / 100;
  }
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
  ];
  for (const { key, ...attributes } of fields) {
    const row = document.createElement("div");
    row.className = "form-group";
    const input = document.createElement("input");
    Object.assign(input, attributes, { name: `${prefix}.${key}`, id: `${app.id}-pin-glow-${key}` });
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

function getColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_COLOR;
}

function getPercent(value, { min, max, default: fallback }) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
