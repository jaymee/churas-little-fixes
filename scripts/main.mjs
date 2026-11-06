const MODULE_ID = "churas-little-fixes";
const HIDE_BORDER = "hideScenePaddingBorder";
const hiddenStrokes = new WeakSet();

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, HIDE_BORDER, {
    name: "CHURAS_LITTLE_FIXES.HideScenePaddingBorder.Name",
    hint: "CHURAS_LITTLE_FIXES.HideScenePaddingBorder.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      if (canvas?.ready) refreshPaddingBorder(canvas);
    },
  });

  Hooks.on("canvasReady", refreshPaddingBorder);
});

function refreshPaddingBorder(view) {
  const sceneRect = view.dimensions?.sceneRect;
  if (!view.scene?.padding || !sceneRect) return;

  const hide = game.settings.get(MODULE_ID, HIDE_BORDER);

  // The interface group keeps its outline private. Match the inner scene
  // rectangle on its direct graphics children, leaving the outer edge alone.
  for (const child of view.interface?.children ?? []) {
    if (!(child instanceof PIXI.Graphics)) continue;
    const geometry = child.geometry;
    if (typeof geometry?.invalidate !== "function") continue;

    let changed = false;
    for (const { shape, lineStyle } of geometry.graphicsData) {
      if (!(shape instanceof PIXI.Rectangle)) continue;
      if (shape.x !== sceneRect.x || shape.y !== sceneRect.y
        || shape.width !== sceneRect.width || shape.height !== sceneRect.height) continue;

      if (hide && lineStyle?.visible && lineStyle.color === 0x000000) {
        lineStyle.visible = false;
        hiddenStrokes.add(lineStyle);
        changed = true;
      } else if (!hide && hiddenStrokes.delete(lineStyle)) {
        lineStyle.visible = true;
        changed = true;
      }
    }

    if (changed) geometry.invalidate();
  }
}
