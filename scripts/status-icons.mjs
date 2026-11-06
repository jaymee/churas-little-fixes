const ICON_HEIGHT = "statusIconHeightPercent";

export function registerStatusIconSizing(moduleId) {
  game.settings.register(moduleId, ICON_HEIGHT, {
    name: "CHURAS_LITTLE_FIXES.StatusIconHeight.Name",
    hint: "CHURAS_LITTLE_FIXES.StatusIconHeight.Hint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 20, step: 0.5 },
    default: 0,
    onChange: () => {
      for (const token of canvas?.tokens?.placeables ?? []) {
        token.renderFlags.set({ refreshEffects: true });
      }
    },
  });

  Hooks.on("refreshToken", (token, flags) => {
    if (!flags.refreshEffects && !flags.refreshSize && !flags.refreshMesh) return;
    const percent = game.settings.get(moduleId, ICON_HEIGHT);
    if (percent > 0) resizeStatusIcons(token, percent);
  });
}

function resizeStatusIcons(token, percent) {
  const height = Math.abs(token.mesh?.height);
  if (!Number.isFinite(height) || height <= 0) return;

  const effects = token.effects;
  const background = effects?.bg;
  if (!background || !effects.renderable) return;
  const icons = effects.children.filter(child => child instanceof PIXI.Sprite && child !== effects.overlay);
  if (!icons.length) return;

  const size = height * percent / 100;
  const rows = Math.max(1, Math.floor(height / size));
  const inset = size / 20;

  // Lay out regular badges and their backing together. Foundry lays out the
  // centered overlay separately, so it keeps its native size and position.
  background.clear().beginFill(0x000000, 0.4).lineStyle(inset, 0x000000);
  for (const [index, icon] of icons.entries()) {
    icon.width = icon.height = size;
    icon.x = Math.floor(index / rows) * size;
    icon.y = (index % rows) * size;
    background.drawRoundedRect(icon.x + inset, icon.y + inset, size - 2 * inset, size - 2 * inset, 2 * inset);
  }
  background.endFill();
}
