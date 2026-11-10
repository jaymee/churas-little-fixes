import { createTravel, registerMapNoteTravel, TRAVEL_FLAG, travelPosition } from "./map-note-travel.mjs";

const FLAG = "questRoute";
const TEXT = "CHURAS_LITTLE_FIXES.QuestRoutes";
const ICON = "fa-solid fa-route";

export function registerQuestRoutes(moduleId) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  const localize = key => game.i18n.localize(`${TEXT}.${key}`);
  const flagPath = `flags.${moduleId}.${FLAG}`;
  const travelPath = `flags.${moduleId}.${TRAVEL_FLAG}`;

  class QuestRoutes extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "churas-quest-routes",
      window: { title: `${TEXT}.Title`, icon: ICON },
      position: { width: 380 },
      actions: {
        pick: QuestRoutes.pick,
        remove: QuestRoutes.remove,
        advance: QuestRoutes.advance,
        restart: QuestRoutes.restart,
        loop: QuestRoutes.loop,
        stop: QuestRoutes.stop,
      },
    };

    static PARTS = {
      content: {
        template: `modules/${moduleId}/templates/quest-routes.hbs`,
        scrollable: [".churas-quest-route-stops"],
      },
    };

    #noteId;
    #picker;
    #saving = false;

    get #notes() {
      if (!game.user.isGM || !canvas?.ready || !canvas.scene) return [];
      return [...canvas.scene.notes.values()];
    }

    get #selectedNote() {
      return this.#notes.find(note => note.id === this.#noteId);
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const notes = this.#notes;
      const note = this.#selectedNote ?? notes[0];
      if (note?.id !== this.#noteId) this.#cancelPick();
      this.#noteId = note?.id;
      const { stops, current } = readRoute(note, moduleId);
      const traveling = Boolean(travelPosition(note, moduleId));
      if (traveling) this.#cancelPick();
      return {
        ...context,
        notes: notes.map(item => ({ id: item.id, label: item.label || item.id, selected: item === note })),
        stops: stops.map(({ x, y }, index) => ({
          index, x, y, current: !traveling && index === current && note.x === x && note.y === y,
          next: !traveling && index === current + 1,
        })),
        picking: Boolean(this.#picker),
        canAdvance: current + 1 < stops.length,
        canRestart: current > 0,
        canLoop: stops.length > 1,
        traveling,
      };
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const select = this.element.querySelector("[data-route-note]");
      if (!select) return;
      select.onchange = event => {
        this.#cancelPick();
        this.#noteId = event.currentTarget.value;
        this.render();
      };
    }

    _onClose(options) {
      this.#cancelPick();
      super._onClose(options);
    }

    refreshNotes(note) {
      if (this.rendered && !this.#saving && note.parent === canvas.scene) this.render();
    }

    #cancelPick() {
      this.#picker?.abort();
      this.#picker = undefined;
    }

    static pick() {
      if (this.#saving) return;
      if (this.#picker) {
        this.#cancelPick();
        return this.render();
      }

      const note = this.#selectedNote;
      const board = canvas?.app?.view;
      if (!note || !board || travelPosition(note, moduleId)) return;
      this.#picker = new AbortController();
      const options = { capture: true, signal: this.#picker.signal };
      let press;

      // Intercept only the waypoint click before the note layer and quest popup see it.
      window.addEventListener("pointerdown", event => {
        if (event.target !== board || !event.isPrimary || event.button !== 0) return;
        event.stopPropagation();
        press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }, options);
      window.addEventListener("pointerup", event => {
        if (press?.id !== event.pointerId) return;
        const { x, y } = press;
        press = undefined;
        if (event.target !== board) return;
        event.stopPropagation();
        if (Math.hypot(event.clientX - x, event.clientY - y) > 6) return;
        this.#cancelPick();
        if (this.#selectedNote !== note || travelPosition(note, moduleId)) return this.render();
        const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
        const stop = { x: Math.round(point.x), y: Math.round(point.y) };
        if (!canvas.dimensions?.rect?.contains(stop.x, stop.y)) {
          ui.notifications.warn(localize("OutsideMap"));
          return this.render();
        }
        const { stops, current } = readRoute(note, moduleId);
        return this.#save(note, { stops: [...stops, stop], current });
      }, options);
      window.addEventListener("pointercancel", event => {
        if (press?.id === event.pointerId) press = undefined;
      }, options);
      window.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        this.#cancelPick();
        this.render();
      }, options);
      return this.render();
    }

    static remove(_event, target) {
      const note = this.#selectedNote;
      if (!note || this.#picker || travelPosition(note, moduleId)) return;
      const { stops, current } = readRoute(note, moduleId);
      const index = Number(target.dataset.stopIndex);
      if (!stops[index]) return;
      stops.splice(index, 1);
      return this.#save(note, { stops, current: index <= current ? current - 1 : current });
    }

    static advance() {
      return this.#move(false);
    }

    static restart() {
      return this.#move(true);
    }

    static loop() {
      const note = this.#selectedNote;
      if (!note || this.#picker || travelPosition(note, moduleId)) return;
      const { stops, current } = readRoute(note, moduleId);
      if (stops.length < 2) return;
      const travel = createTravel(note, stops, current, (current + 1) % stops.length, true);
      if (!travel) return ui.notifications.warn(localize("LoopNeedsDistance"));
      return this.#save(note, { stops, current }, { [travelPath]: travel });
    }

    static stop() {
      const note = this.#selectedNote;
      const position = travelPosition(note, moduleId);
      if (!position) return;
      const { stops } = readRoute(note, moduleId);
      return this.#save(note, { stops, current: position.index }, {
        x: Math.round(position.x), y: Math.round(position.y), [travelPath]: null,
      });
    }

    #move(restart) {
      const note = this.#selectedNote;
      if (!note || this.#picker || travelPosition(note, moduleId)) return;
      const { stops, current } = readRoute(note, moduleId);
      const next = restart ? 0 : current + 1;
      if (!stops[next]) return;
      const travel = restart ? null : createTravel(note, stops, current, next, false);
      return this.#save(note, { stops, current: next }, { ...stops[next], [travelPath]: travel });
    }

    async #save(note, route, position = {}) {
      if (this.#saving) return;
      this.#saving = true;
      try {
        // Keep the note position and route progress in the same document update.
        await note.update({ ...position, [flagPath]: route });
      } catch (error) {
        console.error(`${moduleId} | Could not update map note route`, error);
        ui.notifications.error(localize("SaveFailed"));
      } finally {
        this.#saving = false;
        if (this.rendered) this.render();
      }
    }
  }

  const panel = new QuestRoutes();
  registerMapNoteTravel(moduleId, note => panel.refreshNotes(note));
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user.isGM) return;
    const notes = controls.notes ?? Object.values(controls).find(control => control.layer === "notes");
    if (!notes) return;
    const tools = notes.tools;
    tools.churasQuestRoutes = {
      name: "churasQuestRoutes",
      title: `${TEXT}.Title`,
      icon: ICON,
      order: Object.keys(tools).length,
      button: true,
      onChange: () => {
        if (panel.rendered) panel.bringToFront();
        else panel.render({ force: true });
      },
    };
  });
  Hooks.on("canvasTearDown", () => {
    if (panel.rendered) panel.close();
  });
  for (const hook of ["createNote", "updateNote", "deleteNote"]) {
    Hooks.on(hook, note => panel.refreshNotes(note));
  }
}

function readRoute(note, moduleId) {
  const route = note?.getFlag(moduleId, FLAG);
  const stops = Array.isArray(route?.stops) ? route.stops.slice() : [];
  const current = Number.isInteger(route?.current) ? Math.max(-1, Math.min(route.current, stops.length - 1)) : -1;
  return { stops, current };
}
