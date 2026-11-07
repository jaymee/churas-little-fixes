const TEXT = "CHURAS_LITTLE_FIXES.MapPins";

export const MAP_PIN_SETTINGS = [
  "hideMapPinBackground", "alwaysShowMapPinLabels", "mapPinFontFamily",
  "mapPinFontSize", "mapPinTextColor", "mapPinTextShadow", "mapPinShadowColor",
  "mapPinStrokeWidth", "mapPinStrokeColor",
];

export function registerMapPins(moduleId) {
  const { ColorField } = foundry.data.fields;
  const definitions = {
    hideMapPinBackground: { type: Boolean, default: false },
    alwaysShowMapPinLabels: { type: Boolean, default: false },
    mapPinFontFamily: { type: String, default: "" },
    mapPinFontSize: { type: Number, range: { min: 0, max: 100, step: 1 }, default: 0 },
    mapPinTextColor: { type: new ColorField(), default: null },
    mapPinTextShadow: {
      type: String,
      choices: { default: `${TEXT}.Default`, on: `${TEXT}.On`, off: `${TEXT}.Off` },
      default: "default",
    },
    mapPinShadowColor: { type: new ColorField(), default: null },
    mapPinStrokeWidth: { type: Number, range: { min: -1, max: 12, step: 1 }, default: -1 },
    mapPinStrokeColor: { type: new ColorField(), default: null },
  };

  let appearance;
  const backgrounds = new WeakMap();
  const forcedLabels = new WeakSet();
  const styles = new WeakMap();

  for (const key of MAP_PIN_SETTINGS) {
    game.settings.register(moduleId, key, {
      name: `${TEXT}.${key}.Name`,
      hint: `${TEXT}.${key}.Hint`,
      scope: "world",
      config: true,
      ...definitions[key],
      onChange: refreshPins,
    });
  }

  Hooks.on("drawNote", applyAppearance);
  Hooks.on("refreshNote", applyAppearance);

  function refreshPins() {
    appearance = undefined;
    for (const pin of canvas?.notes?.placeables ?? []) {
      pin.renderFlags.set({ refreshState: true, refreshTooltip: true });
    }
  }

  function applyAppearance(note) {
    appearance ??= readAppearance(moduleId);

    const background = note.controlIcon?.bg;
    if (background && appearance.hideBackground) {
      if (!backgrounds.has(background)) backgrounds.set(background, background.renderable);
      background.renderable = false;
    } else if (backgrounds.has(background)) {
      background.renderable = backgrounds.get(background);
      backgrounds.delete(background);
    }

    const tooltip = note.tooltip;
    if (!tooltip) return;

    // Only expose the label on a pin Foundry already lets this client see.
    if (appearance.alwaysShow && note.visible && note.isVisible) {
      if (!tooltip.visible) forcedLabels.add(tooltip);
      tooltip.visible = true;
    } else if (forcedLabels.delete(tooltip) && !note.hover) {
      tooltip.visible = false;
    }

    const previous = styles.get(tooltip);
    const current = tooltip.style;
    const source = previous?.applied === current ? previous.source : current;
    if (!appearance.style) {
      if (source !== current) tooltip.style = source;
      styles.delete(tooltip);
      return;
    }
    if (previous?.appearance === appearance && previous.applied === current) return;

    const applied = source.clone();
    Object.assign(applied, appearance.style);
    tooltip.style = applied;
    styles.set(tooltip, { source, applied, appearance });
  }
}

function readAppearance(moduleId) {
  const get = key => game.settings.get(moduleId, key);
  const fontFamily = get("mapPinFontFamily").trim();
  const fontSize = get("mapPinFontSize");
  const fill = get("mapPinTextColor");
  const shadow = get("mapPinTextShadow");
  const shadowColor = get("mapPinShadowColor");
  const strokeThickness = get("mapPinStrokeWidth");
  const stroke = get("mapPinStrokeColor");

  const style = {};
  if (fontFamily) style.fontFamily = fontFamily;
  if (fontSize > 0) style.fontSize = fontSize;
  if (fill != null) style.fill = fill.css ?? fill;
  if (shadow !== "default") style.dropShadow = shadow === "on";
  if (shadow === "on") {
    style.dropShadowDistance = 2;
    style.dropShadowBlur = 2;
    style.dropShadowAlpha = 0.85;
  }
  if (shadowColor != null) style.dropShadowColor = shadowColor.css ?? shadowColor;
  if (strokeThickness >= 0) style.strokeThickness = strokeThickness;
  if (stroke != null) style.stroke = stroke.css ?? stroke;

  return {
    hideBackground: get("hideMapPinBackground"),
    alwaysShow: get("alwaysShowMapPinLabels"),
    style: Object.keys(style).length ? style : null,
  };
}
