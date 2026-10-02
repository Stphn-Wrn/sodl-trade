import { TradeHub, hubBadgeTotal } from "./apps/trade-hub.js";
import { TradeWindow } from "./apps/trade-window.js";
import { CHAT_LOOT_SETTING, CHAT_SHOP_SETTING, CHAT_TRADES_SETTING, LOOT_SETTING, SHOP_APPROVAL_SETTING, MODULE_ID, PRICE_UNIT_SETTING, SHOP_SETTING, TRADES_SETTING } from "./shared/constants.js";
import { backToTokenControls, isPlayerCharacter, ownedCharacterIds, t } from "./shared/foundry-adapter.js";
import { registerSocket } from "./socket.js";
import { CHAT_MODES } from "./trade/chat-audience.js";
import { readLoot } from "./trade/loot-store.js";
import { canAccessLoot, emptyLoot } from "./trade/loot.js";
import { emptyShop, openCategories } from "./trade/shop.js";
import { readShop } from "./trade/shop-store.js";
import { readTrades, roleOf } from "./trade/trade-store.js";

let knownTradeIds = new Set();
// Ids of the treasures players can already see.
let knownLootIds = new Set();
let knownLootAccess = false;
// Ids of the purchase orders the GM has already been told about.
let knownOrderIds = new Set();
// Ids of the shops players could already buy from.
let knownOpenShopIds = new Set();

const CONTROL_NAME = "sodlTrade";

// The toolbar button carries a counter of what needs attention, read by CSS from a data attribute.
function refreshToolbarBadge() {
  const button = document.querySelector(`#scene-controls [data-control="${CONTROL_NAME}"]`);
  if (!button) {
    return;
  }
  const total = hubBadgeTotal();
  if (total > 0) {
    button.dataset.sodlCount = String(total);
  } else {
    delete button.dataset.sodlCount;
  }
}

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
  refreshToolbarBadge();
}

function revealedIds(loot) {
  return loot.items.filter((item) => item.revealed).map((item) => item.id);
}

function hasLootAccess(loot) {
  return !game.user.isGM && canAccessLoot(loot, ownedCharacterIds());
}

function notifyLoot(loot) {
  if (!hasLootAccess(loot)) {
    return;
  }
  if (!knownLootAccess) {
    ui.notifications.info(t("SODLTRADE.Notify.LootOpened"));
    return;
  }
  if (revealedIds(loot).some((id) => !knownLootIds.has(id))) {
    ui.notifications.info(t("SODLTRADE.Notify.LootAdded"));
  }
}

function notifyOpenedShops(shop) {
  if (game.user.isGM) {
    return;
  }
  for (const category of openCategories(shop).filter((entry) => !knownOpenShopIds.has(entry.id))) {
    ui.notifications.info(t("SODLTRADE.Notify.ShopOpened", { name: category.name }));
  }
}

function onShopChanged(shop) {
  const orders = shop.orders ?? [];
  if (game.user.isGM && orders.some((order) => !knownOrderIds.has(order.id))) {
    ui.notifications.info(t("SODLTRADE.Notify.NewOrder"));
  }
  notifyOpenedShops(shop);
  knownOrderIds = new Set(orders.map((order) => order.id));
  knownOpenShopIds = new Set(openCategories(shop).map((category) => category.id));
  TradeHub.refreshAll();
  refreshToolbarBadge();
}

function onLootChanged(loot) {
  notifyLoot(loot);
  knownLootIds = new Set(revealedIds(loot));
  knownLootAccess = hasLootAccess(loot);
  TradeHub.refreshAll();
  refreshToolbarBadge();
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
    onChange: onShopChanged
  });
  game.settings.register(MODULE_ID, PRICE_UNIT_SETTING, {
    name: "SODLTRADE.Settings.PriceUnit.Name",
    hint: "SODLTRADE.Settings.PriceUnit.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: { gc: "SODLTRADE.Wealth.gc", ss: "SODLTRADE.Wealth.ss", cp: "SODLTRADE.Wealth.cp", bits: "SODLTRADE.Wealth.bits" },
    default: "gc"
  });
  // One setting per kind of chat message: who sees it, if anyone.
  for (const [key, label, fallback] of [
    [CHAT_TRADES_SETTING, "Trades", "involved"],
    [CHAT_LOOT_SETTING, "Loot", "everyone"],
    [CHAT_SHOP_SETTING, "Shop", "involved"]
  ]) {
    game.settings.register(MODULE_ID, key, {
      name: `SODLTRADE.Settings.Chat${label}.Name`,
      hint: `SODLTRADE.Settings.Chat${label}.Hint`,
      scope: "world",
      config: true,
      type: String,
      choices: Object.fromEntries(CHAT_MODES.map((mode) => [mode, `SODLTRADE.Settings.ChatMode.${mode}`])),
      default: fallback
    });
  }
  game.settings.register(MODULE_ID, SHOP_APPROVAL_SETTING, {
    name: "SODLTRADE.Settings.ShopApproval.Name",
    hint: "SODLTRADE.Settings.ShopApproval.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => TradeHub.refreshAll()
  });
});

Hooks.once("ready", () => {
  registerSocket();
  knownTradeIds = new Set(Object.keys(readTrades()));
  const loot = readLoot();
  knownLootIds = new Set(revealedIds(loot));
  knownLootAccess = hasLootAccess(loot);
  const shop = readShop();
  knownOrderIds = new Set((shop.orders ?? []).map((order) => order.id));
  knownOpenShopIds = new Set(openCategories(shop).map((category) => category.id));
  refreshToolbarBadge();
});

Hooks.on("renderSceneControls", () => refreshToolbarBadge());

Hooks.on("getSceneControlButtons", (controls) => {
  controls[CONTROL_NAME] = {
    name: CONTROL_NAME,
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
  for (const button of html.querySelectorAll("[data-sodl-trade-shop]")) {
    button.addEventListener("click", () => TradeHub.open("shop"));
  }
  for (const button of html.querySelectorAll("[data-sodl-trade-loot]")) {
    button.addEventListener("click", () => TradeHub.open("loot"));
  }
});
