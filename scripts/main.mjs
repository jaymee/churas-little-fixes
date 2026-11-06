import { registerBrowserTab } from "./browser-tab.mjs";
import { registerStatusIconSizing } from "./status-icons.mjs";

const MODULE_ID = "churas-little-fixes";
const HIDE_BORDER = "hideScenePaddingBorder";
const TOP_ALIGN_CHAT_PORTRAITS = "topAlignChatPortraits";

Hooks.once("init", () => {
  registerBrowserTab(MODULE_ID);
  registerStatusIconSizing(MODULE_ID);
  game.settings.register(MODULE_ID, TOP_ALIGN_CHAT_PORTRAITS, {
    name: "CHURAS_LITTLE_FIXES.TopAlignChatPortraits.Name",
    hint: "CHURAS_LITTLE_FIXES.TopAlignChatPortraits.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: setChatPortraitAlignment,
  });
  Hooks.once("ready", () => {
    setChatPortraitAlignment(game.settings.get(MODULE_ID, TOP_ALIGN_CHAT_PORTRAITS));
  });
  game.settings.register(MODULE_ID, HIDE_BORDER, {
    name: "CHURAS_LITTLE_FIXES.HideScenePaddingBorder.Name",
    hint: "CHURAS_LITTLE_FIXES.HideScenePaddingBorder.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => window.setTimeout(() => window.location.reload(), 0),
  });

  Hooks.on("canvasReady", hideSceneOutline);
});

function setChatPortraitAlignment(enabled) {
  document.documentElement.classList.toggle("churas-top-align-chat-portraits", enabled);
}

function hideSceneOutline(view) {
  if (!game.settings.get(MODULE_ID, HIDE_BORDER)) return;

  const { rect, sceneRect } = view.dimensions ?? {};
  if (!sceneRect) return;

  // Foundry draws the canvas edge and the inner scene edge on one
  // private graphics object. Leave other interface graphics alone.
  const outline = view.interface?.children.find(child => {
    if (!(child instanceof PIXI.Graphics)) return false;
    const shapes = child.geometry?.graphicsData;
    return shapes?.length > 0 && shapes.every(({ shape, lineStyle, fillStyle }) =>
      shape instanceof PIXI.Rectangle && lineStyle?.visible && lineStyle.color === 0x000000
      && !fillStyle?.visible && (sameRectangle(shape, rect) || sameRectangle(shape, sceneRect))
    );
  });

  if (outline) outline.renderable = false;
}

function sameRectangle(shape, bounds) {
  return bounds && shape.x === bounds.x && shape.y === bounds.y
    && shape.width === bounds.width && shape.height === bounds.height;
}
