import { modulePath } from "../shared/constants.js";
import { captureFocus, restoreFocus } from "./focus.js";
import { extensions } from "../shared/extensions.js";
import { isPlayerCharacter, openApps, t } from "../shared/foundry-adapter.js";
import { describeOffer } from "../trade/trade-view.js";
import { isEmptyWealth, toWealth } from "../trade/wealth.js";
import { craftingPanel } from "./panels/crafting-panel.js";
import { harvestPanel } from "./panels/harvest-panel.js";
import { labPanel } from "./panels/lab-panel.js";
import { lootPanel } from "./panels/loot-panel.js";
import { shopPanel } from "./panels/shop-panel.js";
import { tradesPanel } from "./panels/trades-panel.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function describePurse(wealth) {
  if (isEmptyWealth(wealth)) {
    return t("SODLTRADE.Window.NoMoney");
  }
  return describeOffer({ items: [], wealth }, t);
}

// Each tab is a panel with its own template, context, listeners and actions.
const CORE_PANELS = [tradesPanel, lootPanel, shopPanel, craftingPanel, labPanel, harvestPanel];

// Extensions register their panels during init, before any window opens, so they are read at render time.
function allPanels() {
  return extensions.panels(CORE_PANELS);
}

// A panel the GM turned off in the settings has no tab at all.
function enabledPanels() {
  return allPanels().filter((panel) => !panel.enabled || panel.enabled());
}

function panelLabel(panel) {
  if (panel.label) {
    return panel.label();
  }
  return t(`SODLTRADE.Hub.Tabs.${panel.id}`);
}

// The toolbar button only shows while at least one tab, the module's or an extension's, is on.
export function hasAnyTab() {
  return enabledPanels().length > 0;
}

export function hubBadgeTotal() {
  return enabledPanels().reduce((total, panel) => total + (panel.badge?.() ?? 0), 0);
}

export class TradeHub extends HandlebarsApplicationMixin(ApplicationV2) {
  // Getters, so the panels extensions registered after this file was loaded are included.
  static get DEFAULT_OPTIONS() {
    return {
      id: "sodl-trade-hub",
      classes: ["sodl-trade"],
      window: { title: "SODLTRADE.Hub.Title", resizable: true },
      // Wide enough for the recipe list beside the workbench; Foundry shrinks it on small screens.
      position: { width: 880, height: 720 },
      // "tab" is reserved by ApplicationV2 for its own tab groups, hence "switchPanel".
      actions: Object.assign({ switchPanel: TradeHub.#onSwitchPanel }, ...allPanels().map((panel) => panel.actions))
    };
  }

  static get PARTS() {
    return {
      header: { template: modulePath("src/apps/hub-header.html") },
      ...Object.fromEntries(allPanels().map((panel) => [panel.id, { template: panel.template }]))
    };
  }

  static open(tab) {
    let hub = openApps(TradeHub)[0];
    if (!hub) {
      hub = new TradeHub();
    }
    if (tab) {
      hub.tab = tab;
    }
    hub.render({ force: true });
  }

  static refreshAll() {
    for (const app of openApps(TradeHub)) {
      app.render();
    }
  }

  tab = "trades";
  // The player's character used to propose trades, take loot and buy.
  actingId = null;
  // Character whose window the GM is looking at, as their player sees it; null for the GM's own view.
  previewId = null;
  // Characters left out of the next money split; everyone shares by default.
  excludedFromSplit = new Set();
  // The GM browses shops like players do, and switches to edit mode to change them.
  shopEditing = false;
  lootEditing = false;
  // The recipe whose form the GM has open, if any.
  craftingEditingId = null;
  // null until the user opens or closes the crafting guide themselves.
  craftingHelpOpen = null;
  // Biome the GM is looking at before opening the harvest.
  harvestBiome = null;
  harvestEditing = false;
  // Biomes the GM has unfolded while editing the map.
  openBiomes = new Set();
  collapsedCategories = new Set();
  // Recipe on the crafting workbench, and how the recipe list is filtered.
  selectedRecipeId = null;
  craftingFilter = { text: "", station: "all", readyOnly: false };
  // Each extension panel's own state, set up once by the panel on this window.
  #setUp = new Set();

  #ownedCharacters(characters) {
    if (game.user.isGM) {
      return characters.filter((actor) => actor.id === this.previewId);
    }
    return characters.filter((actor) => actor.isOwner);
  }

  #previewView(characters) {
    if (!game.user.isGM) {
      return null;
    }
    return { characters: characters.map((actor) => ({ id: actor.id, name: actor.name, selected: actor.id === this.previewId })) };
  }

  async _prepareContext() {
    const characters = game.actors.filter(isPlayerCharacter);
    if (!characters.some((actor) => actor.id === this.previewId)) {
      this.previewId = null;
    }
    // While previewing a character, the panels are drawn as for a player.
    const gmView = game.user.isGM && !this.previewId;
    const mine = this.#ownedCharacters(characters);
    if (!mine.some((actor) => actor.id === this.actingId)) {
      this.actingId = mine[0]?.id ?? null;
    }
    const actingActor = mine.find((actor) => actor.id === this.actingId);
    let acting = null;
    if (actingActor) {
      acting = { id: actingActor.id, name: actingActor.name, img: actingActor.img, purse: describePurse(toWealth(actingActor.system.wealth)) };
    }
    // The characters whose orders are listed: the player's own, or the one the GM previews.
    const base = { isGM: gmView, characters, ownIds: mine.map((actor) => actor.id) };
    const panels = enabledPanels();
    const closed = panels.filter((panel) => !game.user.isGM && panel.isOpen && !panel.isOpen()).map((panel) => panel.id);
    if (closed.includes(this.tab) || !panels.some((panel) => panel.id === this.tab)) {
      this.tab = panels.find((panel) => !closed.includes(panel.id))?.id ?? panels[0]?.id ?? null;
    }
    const context = {
      isGM: gmView,
      preview: this.#previewView(characters),
      tabs: panels.map((panel) => ({ id: panel.id, label: panelLabel(panel), badge: panel.badge?.() ?? 0, active: panel.id === this.tab, closed: closed.includes(panel.id) })),
      mine: mine.map((actor) => ({ id: actor.id, name: actor.name, selected: actor.id === this.actingId })),
      noCharacter: !game.user.isGM && mine.length === 0,
      acting
    };
    for (const panel of allPanels()) {
      if (!this.#setUp.has(panel.id)) {
        panel.setup?.(this);
        this.#setUp.add(panel.id);
      }
      if (panels.includes(panel)) {
        context[panel.id] = { visible: panel.id === this.tab, ...(await panel.prepare(this, base)) };
      } else {
        context[panel.id] = { visible: false };
      }
    }
    return context;
  }

  #focus = null;

  async _preRender(context, options) {
    await super._preRender(context, options);
    this.#focus = captureFocus(this.element);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    restoreFocus(this.element, this.#focus);
    this.#focus = null;
    this.element.querySelector("[name=preview]")?.addEventListener("change", (event) => {
      this.previewId = event.target.value || null;
      this.render();
    });
    this.element.querySelector("[name=acting]")?.addEventListener("change", (event) => {
      this.actingId = event.target.value;
      this.render();
    });
    for (const panel of enabledPanels()) {
      panel.bind?.(this);
    }
  }

  static #onSwitchPanel(event, target) {
    this.tab = target.dataset.panelId;
    this.render();
  }
}
