import { TradeHub } from "./apps/trade-hub.js";
import { TradeWindow } from "./apps/trade-window.js";
import { LOOT_SETTING, MODULE_ID, PRICE_UNIT_SETTING, SHOP_SETTING, TRADES_SETTING } from "./shared/constants.js";
import { backToTokenControls, isPlayerCharacter, t } from "./shared/foundry-adapter.js";
import { registerSocket } from "./socket.js";
import { readLoot } from "./trade/loot-store.js";
import { emptyLoot } from "./trade/loot.js";
import { emptyShop } from "./trade/shop.js";
import { readTrades, roleOf } from "./trade/trade-store.js";

let knownTradeIds = new Set();
let knownLootIds = new Set();

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

function onLootChanged(loot) {
  const added = loot.items.some((item) => !knownLootIds.has(item.id));
  if (added && !game.user.isGM) {
    ui.notifications.info(t("SODLTRADE.Notify.LootAdded"));
  }
  knownLootIds = new Set(loot.items.map((item) => item.id));
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
  game.settings.register(MODULE_ID, LOOT_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: emptyLoot(),
    onChange: onLootChanged
  });
  game.settings.register(MODULE_ID, SHOP_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: emptyShop(),
    onChange: () => TradeHub.refreshAll()
  });
  game.settings.register(MODULE_ID, PRICE_UNIT_SETTING, {
    name: "SODLTRADE.Settings.PriceUnit.Name",
    hint: "SODLTRADE.Settings.PriceUnit.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: { gc: "SODLTRADE.Wealth.gc", ss: "SODLTRADE.Wealth.ss", cp: "SODLTRADE.Wealth.cp", bits: "SODLTRADE.Wealth.bits" },
    default: "ss"
  });
});

Hooks.once("ready", () => {
  registerSocket();
  knownTradeIds = new Set(Object.keys(readTrades()));
  knownLootIds = new Set(readLoot().items.map((item) => item.id));
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

// Keeps the purse shown in the hub up to date after a purchase or a trade.
Hooks.on("updateActor", (actor) => {
  if (isPlayerCharacter(actor)) {
    TradeHub.refreshAll();
  }
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  for (const button of html.querySelectorAll("[data-sodl-trade-open]")) {
    button.addEventListener("click", () => TradeWindow.open(button.dataset.sodlTradeOpen));
  }
});
