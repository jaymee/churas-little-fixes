const QUEST_MARKER = "questMarker";
export const QUEST_POPUP_FONT = "questPopupFontFamily";
const TEXT = "CHURAS_LITTLE_FIXES.QuestMarkers";

export function isQuestMarker(note, moduleId) {
  return note.document.getFlag(moduleId, QUEST_MARKER) === true;
}

export function registerQuestMarkers(moduleId) {
  let active;
  let press;
  const localize = key => game.i18n.localize(`${TEXT}.${key}`);

  game.settings.register(moduleId, QUEST_POPUP_FONT, {
    name: `${TEXT}.FontFamily.Name`,
    hint: `${TEXT}.FontFamily.Hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: applyPopupFont,
  });

  Hooks.on("renderNoteConfig", (app, html) => {
    if (game.user.isGM) addQuestCheckbox(app, html, moduleId, localize);
  });
  Hooks.on("refreshNote", note => {
    if (note === active?.note && !canSeePin(note)) closePopup();
  });
  Hooks.on("updateNote", document => {
    if (document === active?.note.document) closePopup();
  });
  Hooks.on("deleteNote", document => {
    if (document === active?.note.document) closePopup();
  });
  for (const hook of ["updateJournalEntry", "deleteJournalEntry", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
    Hooks.on(hook, document => {
      if (active && [active.page.uuid, active.page.parent?.uuid].includes(document.uuid)) closePopup();
    });
  }
  Hooks.on("canvasPan", positionPopup);
  Hooks.on("canvasTearDown", () => {
    press = undefined;
    closePopup();
  });

  // Observe the browser's canvas events before Foundry routes them through
  // the active layer. A visible note may not receive its own PIXI events.
  document.addEventListener("pointerdown", event => {
    if (active && !active.element.contains(event.target)) closePopup();
    if (!event.isPrimary || event.button !== 0) return;
    const note = questPinAt(event);
    press = note ? { note, id: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
  }, true);
  document.addEventListener("pointerup", event => {
    if (press?.id !== event.pointerId) return;
    const { note, x, y } = press;
    press = undefined;
    if (Math.hypot(event.clientX - x, event.clientY - y) > 6 || note.mouseInteractionManager?.isDragging) return;
    if (questPinAt(event) !== note) return;
    const page = questPage(note);
    if (page) openPopup(note, page);
    else ui.notifications.warn(localize(game.user.isGM ? "MissingPage" : "Unavailable"));
  }, true);
  document.addEventListener("pointercancel", event => {
    if (press?.id === event.pointerId) press = undefined;
  }, true);
  document.addEventListener("keydown", event => {
    if (!active || event.key !== "Escape") return;
    event.stopPropagation();
    closePopup();
  }, true);

  Hooks.on("activateNote", note => {
    if (isQuestMarker(note, moduleId) && questPage(note)) return false;
  });

  function questPinAt(event) {
    if (!canvas?.ready || event.target !== canvas.app?.view) return;
    const { x, y } = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
    const note = canvas.notes?.placeables.findLast(pin =>
      pin.controlIcon?.visible && canSeePin(pin) && pin.bounds.contains(x, y)
    );
    if (note && isQuestMarker(note, moduleId)) return note;
  }

  function openPopup(note, page) {
    closePopup();
    const element = document.createElement("aside");
    element.className = "churas-quest-popup";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-label", localize("Details"));

    const close = document.createElement("button");
    close.type = "button";
    close.className = "churas-quest-close";
    close.textContent = "×";
    close.setAttribute("aria-label", localize("Close"));
    close.addEventListener("click", closePopup);

    const body = document.createElement("div");
    body.className = "churas-quest-text";
    body.textContent = readQuestText(page) || localize("Empty");
    element.append(close, body);
    document.body.append(element);
    active = { element, note, page };
    applyPopupFont(game.settings.get(moduleId, QUEST_POPUP_FONT));
  }

  function applyPopupFont(fontFamily) {
    if (!active) return;
    active.element.style.removeProperty("font-family");
    active.element.style.fontFamily = fontFamily.trim();
    positionPopup();
  }

  function positionPopup() {
    if (!active) return;
    const { element, note } = active;
    if (!canSeePin(note)) {
      closePopup();
      return;
    }
    const { width, height } = element.getBoundingClientRect();
    const { x, y } = canvas.clientCoordinatesFromCanvas({ x: note.document.x, y: note.document.y });
    const margin = 8;
    element.style.left = `${Math.max(margin, Math.min(x + 12, window.innerWidth - width - margin))}px`;
    element.style.top = `${Math.max(margin, Math.min(y + 12, window.innerHeight - height - margin))}px`;
  }

  function closePopup() {
    active?.element.remove();
    active = undefined;
  }
}

function addQuestCheckbox(app, html, moduleId, localize) {
  const note = app.document;
  const root = html.querySelector ? html : html[0];
  const name = `flags.${moduleId}.${QUEST_MARKER}`;
  const labelField = root?.querySelector('[name="text"]')?.closest(".form-group");
  if (!note || !labelField || root.querySelector(`[name="${name}"]`)) return;

  const row = document.createElement("div");
  row.className = "form-group";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.id = `${app.id}-quest-marker`;
  input.checked = note.getFlag(moduleId, QUEST_MARKER) === true;

  const label = document.createElement("label");
  label.htmlFor = input.id;
  label.textContent = localize("Name");
  const fields = document.createElement("div");
  fields.className = "form-fields";
  fields.append(input);
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = localize("Hint");
  row.append(label, fields, hint);
  labelField.after(row);
}

function canSeePin(note) {
  return !note.isPreview && note.visible && note.worldVisible !== false && note.isVisible;
}

function questPage(note) {
  const { pageId, entry } = note.document;
  let page = note.document.page;
  if (!page && !pageId) {
    const textPages = entry?.pages.filter(candidate => candidate.type === "text") ?? [];
    if (textPages.length === 1) [page] = textPages;
  }
  return page?.type === "text" && page.testUserPermission(game.user, "OBSERVER") ? page : null;
}

function readQuestText(page) {
  // Keep the preview plain text. The template is inert and never inserted into the page.
  const template = document.createElement("template");
  template.innerHTML = page.text.content ?? "";
  template.content.querySelectorAll(".secret:not(.revealed), script, style, template, iframe").forEach(node => node.remove());
  template.content.querySelectorAll("br").forEach(node => node.replaceWith("\n"));
  template.content.querySelectorAll("p, li, div, h1, h2, h3, h4, h5, h6").forEach(node => node.append("\n"));
  return template.content.textContent.trim();
}
