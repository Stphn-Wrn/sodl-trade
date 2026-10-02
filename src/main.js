import { TradeHub } from "./apps/trade-hub.js";
import { TradeWindow } from "./apps/trade-window.js";
import { MODULE_ID, TRADES_SETTING } from "./shared/constants.js";
import { backToTokenControls, t } from "./shared/foundry-adapter.js";
import { registerSocket } from "./socket.js";
import { readTrades, roleOf } from "./trade/trade-store.js";

let knownTradeIds = new Set();

// The world setting is the shared state: the GM writes it, every client re-renders when it changes.
function onTradesChanged(trades) {
  for (const trade of Object.values(trades)) {
    if (knownTradeIds.has(trade.id) || game.user.isGM) {
      continue;
    }
    const role = roleOf(trade, game.user);
    if (role === 1) {
      ui.notifications.info(t("SODLTRADE.Notify.Invited", { name: trade.parties[0].name }));
    }
    if (role !== null) {
      TradeWindow.open(trade.id);
    }
  }
  knownTradeIds = new Set(Object.keys(trades));
  TradeWindow.refreshAll();
  TradeHub.refreshAll();
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, TRADES_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: onTradesChanged
  });
});

Hooks.once("ready", () => {
  registerSocket();
  knownTradeIds = new Set(Object.keys(readTrades()));
});

Hooks.on("getSceneControlButtons", (controls) => {
  controls.sodlTrade = {
    name: "sodlTrade",
    title: t("SODLTRADE.Title"),
    icon: "fas fa-right-left",
    order: 103,
    tools: {
      open: {
        name: "open",
        title: t("SODLTRADE.OpenTool"),
        icon: "fas fa-right-left",
        button: true,
        onChange: (event, active) => {
          if (active) {
            TradeHub.open();
            backToTokenControls();
          }
        }
      }
    },
    activeTool: "open"
  };
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  for (const button of html.querySelectorAll("[data-sodl-trade-open]")) {
    button.addEventListener("click", () => TradeWindow.open(button.dataset.sodlTradeOpen));
  }
});
