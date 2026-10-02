import { modulePath } from "../shared/constants.js";
import { isPlayerCharacter, openApps, t } from "../shared/foundry-adapter.js";
import { describeOffer } from "../trade/trade-view.js";
import { toWealth } from "../trade/wealth.js";
import { lootPanel } from "./panels/loot-panel.js";
import { shopPanel } from "./panels/shop-panel.js";
import { tradesPanel } from "./panels/trades-panel.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Each tab is a panel with its own template, context, listeners and actions.
const PANELS = [tradesPanel, lootPanel, shopPanel];

export class TradeHub extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "sodl-trade-hub",
    classes: ["sodl-trade"],
    window: { title: "SODLTRADE.Title", icon: "fas fa-right-left", resizable: true },
    position: { width: 520, height: "auto" },
    // "tab" is reserved by ApplicationV2 for its own tab groups, hence "switchPanel".
    actions: Object.assign({ switchPanel: TradeHub.#onSwitchPanel }, ...PANELS.map((panel) => panel.actions))
  };

  static PARTS = {
    header: { template: modulePath("src/apps/hub-header.html") },
    ...Object.fromEntries(PANELS.map((panel) => [panel.id, { template: panel.template }]))
  };

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
  // Characters left out of the next money split; everyone shares by default.
  excludedFromSplit = new Set();

  #ownedCharacters(characters) {
    if (game.user.isGM) {
      return [];
    }
    return characters.filter((actor) => actor.isOwner);
  }

  async _prepareContext() {
    const characters = game.actors.filter(isPlayerCharacter);
    const mine = this.#ownedCharacters(characters);
    if (!mine.some((actor) => actor.id === this.actingId)) {
      this.actingId = mine[0]?.id ?? null;
    }
    const actingActor = mine.find((actor) => actor.id === this.actingId);
    let acting = null;
    if (actingActor) {
      acting = { id: actingActor.id, purse: describeOffer({ items: [], wealth: toWealth(actingActor.system.wealth) }, t) };
    }
    const base = { isGM: game.user.isGM, characters };
    const closed = PANELS.filter((panel) => !game.user.isGM && panel.isOpen && !panel.isOpen()).map((panel) => panel.id);
    if (closed.includes(this.tab)) {
      this.tab = "trades";
    }
    const context = {
      isGM: game.user.isGM,
      tabs: PANELS.map((panel) => ({ id: panel.id, label: t(`SODLTRADE.Hub.Tabs.${panel.id}`), active: panel.id === this.tab, closed: closed.includes(panel.id) })),
      mine: mine.map((actor) => ({ id: actor.id, name: actor.name, selected: actor.id === this.actingId })),
      noCharacter: !game.user.isGM && mine.length === 0,
      acting
    };
    for (const panel of PANELS) {
      context[panel.id] = { visible: panel.id === this.tab, ...(await panel.prepare(this, base)) };
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[name=acting]")?.addEventListener("change", (event) => {
      this.actingId = event.target.value;
      this.render();
    });
    for (const panel of PANELS) {
      panel.bind?.(this);
    }
  }

  static #onSwitchPanel(event, target) {
    this.tab = target.dataset.panelId;
    this.render();
  }
}
