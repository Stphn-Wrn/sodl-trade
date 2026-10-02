import { modulePath } from "../shared/constants.js";
import { openApps, t } from "../shared/foundry-adapter.js";
import { sendAction } from "../socket.js";
import { toInventory } from "../trade/inventory.js";
import { getTrade, roleOf } from "../trade/trade-store.js";
import { tradeView } from "../trade/trade-view.js";
import { DENOMINATIONS } from "../trade/wealth.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function ownInventory(trade, role) {
  if (role !== 0 && role !== 1) {
    return null;
  }
  const actor = game.actors.get(trade.parties[role].actorId);
  if (!actor) {
    return null;
  }
  return toInventory(actor);
}

export class TradeWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["sodl-trade"],
    window: { icon: "fas fa-right-left", resizable: true },
    position: { width: 620, height: "auto" },
    actions: {
      addItem: TradeWindow.#onAddItem,
      removeItem: TradeWindow.#onRemoveItem,
      setWealth: TradeWindow.#onSetWealth,
      accept: TradeWindow.#onSimpleAction,
      withdraw: TradeWindow.#onSimpleAction,
      cancel: TradeWindow.#onSimpleAction,
      approve: TradeWindow.#onSimpleAction,
      reject: TradeWindow.#onSimpleAction
    }
  };

  static PARTS = {
    body: { template: modulePath("src/apps/trade-window.html") }
  };

  static open(tradeId) {
    const existing = openApps(TradeWindow).find((app) => app.tradeId === tradeId);
    if (existing) {
      existing.bringToFront();
      return;
    }
    if (!getTrade(tradeId)) {
      ui.notifications.warn(t("SODLTRADE.Errors.TradeNotFound"));
      return;
    }
    new TradeWindow(tradeId).render({ force: true });
  }

  static refreshAll() {
    for (const app of openApps(TradeWindow)) {
      if (getTrade(app.tradeId)) {
        app.render();
      } else {
        app.close();
      }
    }
  }

  constructor(tradeId) {
    super({ id: `sodl-trade-${tradeId}` });
    this.tradeId = tradeId;
  }

  get title() {
    const trade = getTrade(this.tradeId);
    if (!trade) {
      return t("SODLTRADE.Title");
    }
    return t("SODLTRADE.WindowTitle", { first: trade.parties[0].name, second: trade.parties[1].name });
  }

  async _prepareContext() {
    const trade = getTrade(this.tradeId);
    if (!trade) {
      return { parties: [] };
    }
    const role = roleOf(trade, game.user);
    return tradeView(trade, role, ownInventory(trade, role), t);
  }

  static #onAddItem() {
    const itemId = this.element.querySelector("[name=itemId]")?.value;
    const quantity = Number(this.element.querySelector("[name=quantity]")?.value);
    if (!itemId) {
      return;
    }
    const trade = getTrade(this.tradeId);
    const offered = trade.parties[roleOf(trade, game.user)].offer.items.find((item) => item.itemId === itemId);
    let total = quantity;
    if (offered) {
      total += offered.quantity;
    }
    sendAction(this.tradeId, { type: "setItem", itemId, quantity: total });
  }

  static #onRemoveItem(event, target) {
    sendAction(this.tradeId, { type: "setItem", itemId: target.dataset.itemId, quantity: 0 });
  }

  static #onSetWealth() {
    const wealth = Object.fromEntries(DENOMINATIONS.map((denomination) => [denomination, this.element.querySelector(`[name="wealth.${denomination}"]`).value]));
    sendAction(this.tradeId, { type: "setWealth", wealth });
  }

  static #onSimpleAction(event, target) {
    sendAction(this.tradeId, { type: target.dataset.action });
  }
}
