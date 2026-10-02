import { modulePath } from "../shared/constants.js";
import { openApps, t } from "../shared/foundry-adapter.js";
import { sendAction } from "../socket.js";
import { toInventory } from "../trade/inventory.js";
import { getTrade, roleOf } from "../trade/trade-store.js";
import { tradeView } from "../trade/trade-view.js";
import { DENOMINATIONS } from "../trade/wealth.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const PARTY_WIDTH = 880;
const GM_WIDTH = 640;

function isParty(role) {
  return role === 0 || role === 1;
}

function ownActor(trade, role) {
  if (!isParty(role)) {
    return null;
  }
  return game.actors.get(trade.parties[role].actorId) ?? null;
}

export class TradeWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["sodl-trade"],
    window: { icon: "fas fa-right-left", resizable: true },
    position: { width: PARTY_WIDTH, height: "auto" },
    actions: {
      addOne: TradeWindow.#onAddOne,
      removeItem: TradeWindow.#onRemoveItem,
      inventoryTab: TradeWindow.#onInventoryTab,
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
    let width = PARTY_WIDTH;
    if (game.user.isGM) {
      width = GM_WIDTH;
    }
    super({ id: `sodl-trade-${tradeId}`, position: { width } });
    this.tradeId = tradeId;
  }

  // Inventory tab shown in the side panel, mirroring the character sheet.
  inventoryTab = "combat";

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
      return { parties: [], inventoryGroups: [] };
    }
    const role = roleOf(trade, game.user);
    const actor = ownActor(trade, role);
    let inventory = null;
    if (actor) {
      inventory = toInventory(actor);
    }
    const view = tradeView(trade, role, inventory, t);
    view.inventoryGroups = view.inventoryGroups.map((group) => ({ ...group, active: group.id === this.inventoryTab }));
    return view;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const trade = getTrade(this.tradeId);
    if (!trade) {
      return;
    }
    const actor = ownActor(trade, roleOf(trade, game.user));
    if (!actor) {
      return;
    }

    for (const entry of this.element.querySelectorAll("[data-inventory-item]")) {
      entry.addEventListener("dragstart", (event) => {
        const item = actor.items.get(entry.dataset.inventoryItem);
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
      });
    }

    const offer = this.element.querySelector(".sodl-trade-party.is-editable");
    if (offer) {
      offer.addEventListener("dragover", (event) => {
        event.preventDefault();
        offer.classList.add("is-dragover");
      });
      offer.addEventListener("dragleave", () => offer.classList.remove("is-dragover"));
      offer.addEventListener("drop", (event) => this.#onDrop(event, actor));
    }

    for (const input of this.element.querySelectorAll("[data-offer-quantity]")) {
      input.addEventListener("change", () => sendAction(this.tradeId, { type: "setItem", itemId: input.dataset.offerQuantity, quantity: input.value }));
    }
    for (const input of this.element.querySelectorAll("[data-offer-wealth]")) {
      input.addEventListener("change", () => sendAction(this.tradeId, { type: "setWealth", wealth: this.#readWealth() }));
    }
  }

  #readWealth() {
    return Object.fromEntries(DENOMINATIONS.map((denomination) => [denomination, this.element.querySelector(`[data-offer-wealth="${denomination}"]`)?.value ?? 0]));
  }

  #addOne(itemId) {
    const trade = getTrade(this.tradeId);
    const offered = trade.parties[roleOf(trade, game.user)].offer.items.find((item) => item.itemId === itemId);
    let quantity = 1;
    if (offered) {
      quantity += offered.quantity;
    }
    sendAction(this.tradeId, { type: "setItem", itemId, quantity });
  }

  // Accepts items dragged from the side panel or from the character's own sheet.
  async #onDrop(event, actor) {
    event.preventDefault();
    event.currentTarget.classList.remove("is-dragover");
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") {
      return;
    }
    const item = await fromUuid(data.uuid);
    if (!item || item.parent?.id !== actor.id) {
      ui.notifications.warn(t("SODLTRADE.Errors.ItemNotOwned"));
      return;
    }
    this.#addOne(item.id);
  }

  static #onAddOne(event, target) {
    this.#addOne(target.dataset.inventoryItem);
  }

  static #onRemoveItem(event, target) {
    sendAction(this.tradeId, { type: "setItem", itemId: target.dataset.itemId, quantity: 0 });
  }

  static #onInventoryTab(event, target) {
    this.inventoryTab = target.dataset.group;
    this.render();
  }

  static #onSimpleAction(event, target) {
    sendAction(this.tradeId, { type: target.dataset.action });
  }
}
