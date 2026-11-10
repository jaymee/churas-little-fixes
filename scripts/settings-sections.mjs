import { MAP_PIN_SETTINGS } from "./map-pins.mjs";
import { QUEST_POPUP_FONT } from "./quest-markers.mjs";

const SECTIONS = [
  { label: "BrowserTab", keys: ["browserFavicon", "browserTitle"] },
  { label: "ChatPortraits", keys: ["topAlignChatPortraits", "compactChatPortraits"] },
  { label: "Canvas", keys: ["hideScenePaddingBorder", "statusIconHeightPercent", "minimumStatusIconSize"] },
  { label: "MapPins", keys: [...MAP_PIN_SETTINGS, QUEST_POPUP_FONT] },
];

export function groupSettings(moduleId, html) {
  for (const { label, keys } of SECTIONS) {
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
  }
}
