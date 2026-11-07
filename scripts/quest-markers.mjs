const QUEST_MARKER = "questMarker";
const TEXT = "CHURAS_LITTLE_FIXES.QuestMarkers";

export function isQuestMarker(note, moduleId) {
  return note.document.getFlag(moduleId, QUEST_MARKER) === true;
}

export function registerQuestMarkers(moduleId) {
  const boundIcons = new WeakSet();
  let active;
  const localize = key => game.i18n.localize(`${TEXT}.${key}`);

  Hooks.on("renderNoteConfig", (app, html) => {
    if (game.user.isGM) addQuestCheckbox(app, html, moduleId, localize);
  });
  Hooks.on("drawNote", bindClick);
  Hooks.on("refreshNote", bindClick);
  Hooks.on("updateNote", document => {
    if (document === active?.note.document) closePopup();
    if (document.object) bindClick(document.object);
  });
  Hooks.on("deleteNote", document => {
    if (document === active?.note.document) closePopup();
  });
  for (const hook of ["updateJournalEntry", "deleteJournalEntry", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
    Hooks.on(hook, document => {
      if (active && [active.page.uuid, active.page.parent?.uuid].includes(document.uuid)) closePopup();
    });
  }
  Hooks.on("canvasPan", closePopup);
  Hooks.on("canvasTearDown", closePopup);

  Hooks.on("activateNote", note => {
    if (isQuestMarker(note, moduleId) && questPage(note)) return false;
  });

  function bindClick(note) {
    if (note === active?.note && !questPage(note)) closePopup();
    const icon = note.controlIcon;
    if (!icon || boundIcons.has(icon) || !isQuestMarker(note, moduleId)) return;
    boundIcons.add(icon);
    icon.on("pointertap", event => {
      if (event.button !== 0 || !isQuestMarker(note, moduleId)) return;
      const page = questPage(note);
      if (page) openPopup(note, page);
    });
  }

  function openPopup(note, page) {
    closePopup();
    const element = document.createElement("aside");
    element.className = "churas-quest-popup";
    element.popover = "auto";
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
    element.addEventListener("toggle", event => {
      if (event.newState === "closed" && active?.element === element) closePopup();
    });

    element.showPopover();
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

function questPage(note) {
  if (note.isPreview || !note.visible || !note.worldVisible || !note.isVisible) return null;
  const page = note.document.page;
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
