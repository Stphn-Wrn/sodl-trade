import { modulePath } from "../shared/constants.js";
import { isPlayerCharacter, openApps, t } from "../shared/foundry-adapter.js";
import { sendRequest } from "../socket.js";
import { readTrades, roleOf } from "../trade/trade-store.js";
import { TradeWindow } from "./trade-window.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function visibleTrades() {
  return Object.values(readTrades())
    .filter((trade) => roleOf(trade, game.user) !== null)
    .map((trade) => ({
      id: trade.id,
      first: trade.parties[0].name,
      second: trade.parties[1].name,
      statusLabel: t(`SODLTRADE.Status.${trade.status}`),
      status: trade.status
    }));
}

function choice(actor) {
  return { id: actor.id, name: actor.name };
}

export class TradeHub extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "sodl-trade-hub",
    classes: ["sodl-trade"],
    window: { title: "SODLTRADE.Title", icon: "fas fa-right-left" },
    position: { width: 420, height: "auto" },
    actions: {
      open: TradeHub.#onOpen,
      propose: TradeHub.#onPropose
    }
  };

  static PARTS = {
    body: { template: modulePath("src/apps/trade-hub.html") }
  };

  static open() {
    const existing = openApps(TradeHub)[0];
    if (existing) {
      existing.bringToFront();
      return;
    }
    new TradeHub().render({ force: true });
  }

  static refreshAll() {
    for (const app of openApps(TradeHub)) {
      app.render();
    }
  }

  async _prepareContext() {
    const characters = game.actors.filter(isPlayerCharacter);
    return {
      trades: visibleTrades(),
      canPropose: !game.user.isGM,
      mine: characters.filter((actor) => actor.isOwner).map(choice),
      partners: characters.filter((actor) => !actor.isOwner).map(choice)
    };
  }

  static #onOpen(event, target) {
    TradeWindow.open(target.dataset.tradeId);
  }

  static #onPropose() {
    const initiatorActorId = this.element.querySelector("[name=initiator]")?.value;
    const targetActorId = this.element.querySelector("[name=target]")?.value;
    if (!initiatorActorId || !targetActorId) {
      return;
    }
    sendRequest("create", { initiatorActorId, targetActorId });
  }
}
