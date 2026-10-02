import { modulePath } from "../../shared/constants.js";
import { t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { readTrades, roleOf } from "../../trade/trade-store.js";
import { TradeWindow } from "../trade-window.js";

function visibleTrades() {
  return Object.values(readTrades())
    .filter((trade) => roleOf(trade, game.user) !== null)
    .map((trade) => ({
      id: trade.id,
      first: trade.parties[0].name,
      firstImg: trade.parties[0].img,
      second: trade.parties[1].name,
      secondImg: trade.parties[1].img,
      statusLabel: t(`SODLTRADE.Status.${trade.status}`),
      status: trade.status
    }));
}

export const tradesPanel = {
  id: "trades",
  template: modulePath("src/apps/panels/trades-panel.html"),

  prepare(app, base) {
    return {
      trades: visibleTrades(),
      partners: base.characters.filter((actor) => !actor.isOwner).map((actor) => ({ id: actor.id, name: actor.name, img: actor.img }))
    };
  },

  actions: {
    open(event, target) {
      TradeWindow.open(target.dataset.tradeId);
    },
    propose(event, target) {
      if (!this.actingId) {
        return;
      }
      sendRequest("create", { initiatorActorId: this.actingId, targetActorId: target.dataset.actorId });
    }
  }
};
