import { MAP_PIN_SETTINGS } from "./map-pins.mjs";
import { QUEST_POPUP_FONT } from "./quest-markers.mjs";
import { SCREEN_OVERLAY_SETTINGS, SCREEN_OVERLAY_USER_MENU } from "./screen-overlay.mjs";

const SECTIONS = [
  { label: "BrowserTab", keys: ["browserFavicon", "browserTitle"] },
  { label: "ChatPortraits", keys: ["topAlignChatPortraits", "compactChatPortraits"] },
  { label: "Canvas", keys: ["hideScenePaddingBorder", "statusIconHeightPercent", "minimumStatusIconSize"] },
  { label: "ScreenOverlay", keys: SCREEN_OVERLAY_SETTINGS, menu: SCREEN_OVERLAY_USER_MENU },
  { label: "MapPins", keys: [...MAP_PIN_SETTINGS, QUEST_POPUP_FONT] },
];

export function groupSettings(moduleId, html) {
  for (const { label, keys, menu } of SECTIONS) {
    const rows = keys.map(key => html.querySelector(`[name="${moduleId}.${key}"]`)?.closest(".form-group"));
    const first = rows[0];
    if (!first || first.closest(".churas-settings-section")) continue;
    if (!rows.every(row => row?.parentElement === first.parentElement)) continue;

    const section = html.ownerDocument.createElement("fieldset");
    section.classList.add("churas-settings-section");
    const legend = html.ownerDocument.createElement("legend");
    legend.textContent = game.i18n.localize(`CHURAS_LITTLE_FIXES.SettingsSections.${label}`);
    first.before(section);
    section.append(legend, ...rows);
    if (menu) {
      const menuRow = html.querySelector(`[data-key="${moduleId}.${menu}"]`)?.closest(".form-group");
      if (menuRow?.parentElement === section.parentElement) section.append(menuRow);
    }
  }
}
