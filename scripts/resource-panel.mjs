const SHOW_PANEL = "showResourcePanel";
const TEXT = "CHURAS_LITTLE_FIXES.ResourcePanel";

export function registerResourcePanel(moduleId) {
  if (game.system.id !== "projectfu") return;

  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  const localize = key => game.i18n.localize(`${TEXT}.${key}`);

  class ResourcePanel extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "churas-resource-panel",
      window: { title: `${TEXT}.Title`, icon: "fa-solid fa-heart-pulse", minimizable: true },
      position: { width: 400 },
      actions: {
        decrease: ResourcePanel.adjust,
        increase: ResourcePanel.adjust,
        defeat: ResourcePanel.adjust,
        heal: ResourcePanel.adjust,
      },
    };

    static PARTS = { content: { template: `modules/${moduleId}/templates/resource-panel.hbs` } };

    #busy = false;

    _onRender(context, options) {
      super._onRender(context, options);
      this.element.querySelectorAll("[data-resource] input").forEach(input => {
        input.addEventListener("keydown", event => {
          if (event.key !== "Enter" || event.repeat) return;
          event.preventDefault();
          event.stopPropagation();
          if (!input.value.trim()) return;
          const action = input.value.trim().startsWith("+") ? "increase" : "decrease";
          void this.#apply(action, input.closest("[data-resource]"));
        });
      });

      for (const action of ["defeat", "heal"]) {
        const button = this.element.querySelector(`[data-action="${action}"]`);
        button.addEventListener("contextmenu", event => {
          event.preventDefault();
          void this.#apply(action, button.closest("[data-resource]"), { hpOnly: true });
        });
      }

      this.refresh();
    }

    refresh(targets = getTargets()) {
      if (!this.rendered) return;

      const targetLabel = this.element.querySelector("[data-target-label]");
      targetLabel.textContent = targets.length === 1 ? targets[0].name : targets.length
        ? game.i18n.format(`${TEXT}.Selected`, { count: targets.length }) : localize("NoTokens");

      for (const section of this.element.querySelectorAll("[data-resource]")) {
        const pools = targets.map(token => getPool(token.actor, section.dataset.resource)).filter(Boolean);
        section.querySelector("output").textContent = pools.length === 1 && targets.length === 1
          ? `${pools[0].value} / ${pools[0].max}` : "—";
        for (const input of section.querySelectorAll("button, input")) {
          input.disabled = !pools.length || (this.#busy && input.tagName === "BUTTON");
        }
      }
    }

    static adjust(event, button) {
      return this.#apply(button.dataset.action, button.closest("[data-resource]"), { statusOnly: event.shiftKey });
    }

    async #apply(action, section, { hpOnly = false, statusOnly = false } = {}) {
      if (this.#busy) return;
      const { resource } = section.dataset;
      const rawAmount = section.querySelector("input").value.trim();
      const amount = rawAmount === "" ? 1 : Math.abs(Number(rawAmount));
      const isDelta = action === "increase" || action === "decrease";
      if (isDelta && (!Number.isSafeInteger(amount) || amount === 0)) {
        ui.notifications.warn(localize("InvalidAmount"));
        return;
      }

      const actors = new Map(getTargets().map(token => [token.actor.uuid, token.actor]));
      this.#busy = true;
      this.refresh();
      try {
        for (const actor of actors.values()) {
          const pool = getPool(actor, resource);
          if (!pool || !actor.canUserModify(game.user, "update")) continue;
          try {
            if (isDelta) {
              const delta = action === "increase" ? amount : -amount;
              await actor.modifyTokenAttribute(`resources.${resource}`, delta, true);
            } else {
              await updateHealth(actor, pool, action, { hpOnly, statusOnly });
            }
          } catch (error) {
            console.error("Chura's Little Fixes | Could not update token resources", error);
            ui.notifications.error(game.i18n.format(`${TEXT}.UpdateFailed`, { name: actor.name }));
          }
        }
      } finally {
        this.#busy = false;
        this.refresh();
      }
    }
  }

  const panel = new ResourcePanel();
  game.settings.register(moduleId, SHOW_PANEL, {
    name: `${TEXT}.Show.Name`,
    hint: `${TEXT}.Show.Hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: show => show ? panel.render({ force: true }) : panel.close(),
  });

  Hooks.on("getSceneControlButtons", controls => {
    if (!controls.tokens) return;
    controls.tokens.tools.churasResourcePanel = {
      name: "churasResourcePanel",
      title: `${TEXT}.Title`,
      icon: "fa-solid fa-heart-pulse",
      button: true,
      onClick: () => panel.render({ force: true }),
    };
  });

  Hooks.once("ready", () => {
    if (game.settings.get(moduleId, SHOW_PANEL)) panel.render({ force: true });
  });
  for (const hook of ["canvasReady", "controlToken", "createToken", "updateToken", "deleteToken", "updateActor"]) {
    Hooks.on(hook, () => panel.refresh());
  }
  Hooks.on("canvasTearDown", () => panel.refresh([]));
}

function getTargets() {
  if (!canvas?.ready) return [];
  const layer = canvas.tokens;
  const canEdit = token => token.actor?.canUserModify(game.user, "update")
    && (getPool(token.actor, "hp") || getPool(token.actor, "mp"));

  if (layer.controlled.length) return layer.controlled.filter(canEdit);
  if (game.user.isGM) return [];
  const candidates = layer.placeables.filter(token => token.isVisible && canEdit(token));
  return candidates.length === 1 ? candidates : [];
}

function getPool(actor, resource) {
  const pool = actor.system?.resources?.[resource];
  return Number.isFinite(pool?.value) && Number.isFinite(pool.max) ? pool : null;
}

async function updateHealth(actor, pool, action, { hpOnly, statusOnly }) {
  const defeated = action === "defeat";
  const status = CONFIG.specialStatusEffects.DEFEATED;
  if (defeated && statusOnly && status) {
    await actor.toggleStatusEffect(status, { active: !actor.statuses.has(status), overlay: true });
    return;
  }

  const value = defeated ? 0 : pool.max;
  if (value !== pool.value) {
    // Project FU reconciles KO when the actor's HP changes.
    await actor.modifyTokenAttribute("resources.hp", value);
  } else if (!hpOnly && status && actor.statuses.has(status) !== defeated) {
    await actor.toggleStatusEffect(status, { active: defeated, overlay: true });
  }
}
