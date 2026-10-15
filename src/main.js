import { TradeHub, hasAnyTab, hubBadgeTotal } from "./apps/trade-hub.js";
import { createApi } from "./api.js";
import { TradeWindow } from "./apps/trade-window.js";
import { SEEN_RECIPES_SETTING, CHAT_CRAFT_SETTING, CHAT_LOOT_SETTING, CHAT_SHOP_SETTING, CHAT_TRADES_SETTING, CRAFT_APPROVAL_SETTING, CRAFTING_SETTING, HARVEST_SCARCITY_SETTING, HARVEST_SETTING, LOOT_SETTING, SHOP_APPROVAL_SETTING, MODULE_ID, PRICE_UNIT_SETTING, SHOP_SETTING, TRADES_SETTING } from "./shared/constants.js";
import { FEATURES, featureSetting } from "./shared/features.js";
import { backToTokenControls, isPlayerCharacter, ownedCharacterIds, t } from "./shared/foundry-adapter.js";
import { registerSocket } from "./socket.js";
import { CHAT_MODES } from "./trade/chat-audience.js";
import { emptyCrafting, knownRecipes } from "./trade/crafting.js";
import { readCrafting } from "./trade/crafting-store.js";
import { SCARCITY_LEVELS, emptyHarvest } from "./trade/harvest.js";
import { readHarvest } from "./trade/harvest-store.js";
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
// Ids of the crafting requests the GM has already been told about.
let knownCraftOrderIds = new Set();
// Recipes the player's characters already knew, as "actorId/recipeId".
let knownRecipeKeys = new Set();
// The harvest as the player last saw it, to tell them when it opens or is renewed.
let knownHarvestSite = null;

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

function recipeKeys(crafting) {
  if (game.user.isGM) {
    return new Set();
  }
  return new Set(ownedCharacterIds().flatMap((actorId) => knownRecipes(crafting, actorId).map((recipe) => `${actorId}/${recipe.id}`)));
}

// A whole book taught at once gives one message per character rather than one per recipe.
function notifyLearned(crafting) {
  const learned = new Map();
  for (const key of recipeKeys(crafting)) {
    if (knownRecipeKeys.has(key)) {
      continue;
    }
    const [actorId, recipeId] = key.split("/");
    learned.set(actorId, [...(learned.get(actorId) ?? []), crafting.recipes.find((entry) => entry.id === recipeId)]);
  }
  for (const [actorId, recipes] of learned) {
    const name = game.actors.get(actorId)?.name ?? "";
    if (recipes.length === 1) {
      ui.notifications.info(t("SODLTRADE.Notify.RecipeLearned", { name, recipe: recipes[0].name }));
    } else {
      ui.notifications.info(t("SODLTRADE.Notify.RecipesLearned", { name, count: recipes.length }));
    }
  }
}

function onCraftingChanged(crafting) {
  const orders = crafting.orders ?? [];
  if (game.user.isGM && orders.some((order) => !knownCraftOrderIds.has(order.id))) {
    ui.notifications.info(t("SODLTRADE.Notify.NewCraftOrder"));
  }
  notifyLearned(crafting);
  knownCraftOrderIds = new Set(orders.map((order) => order.id));
  knownRecipeKeys = recipeKeys(crafting);
  TradeHub.refreshAll();
  refreshToolbarBadge();
}

function myHarvesters(site) {
  const mine = ownedCharacterIds();
  return site.harvestedBy.filter((actorId) => mine.includes(actorId));
}

function notifyHarvest(site) {
  if (game.user.isGM || !site) {
    return;
  }
  if (!knownHarvestSite || knownHarvestSite.biome !== site.biome) {
    ui.notifications.info(t("SODLTRADE.Notify.HarvestOpened"));
    return;
  }
  if (myHarvesters(knownHarvestSite).length > 0 && myHarvesters(site).length === 0) {
    ui.notifications.info(t("SODLTRADE.Notify.HarvestRenewed"));
  }
}

function onHarvestChanged(harvest) {
  notifyHarvest(harvest.site);
  knownHarvestSite = harvest.site;
  TradeHub.refreshAll();
  refreshToolbarBadge();
}

// Turning a part on or off changes the tabs, and the toolbar button when every part is off.
function onFeatureToggled() {
  TradeHub.refreshAll();
  ui.controls?.render({ reset: true });
}

Hooks.once("init", () => {
  // Registered first so the switches head the module's settings.
  for (const feature of FEATURES) {
    game.settings.register(MODULE_ID, featureSetting(feature), {
      name: `SODLTRADE.Settings.Features.${feature}.Name`,
      hint: `SODLTRADE.Settings.Features.${feature}.Hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: onFeatureToggled
    });
  }
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
  game.settings.register(MODULE_ID, CRAFTING_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: emptyCrafting(),
    onChange: onCraftingChanged
  });
  // Recipes each of this player's characters has already opened, so new ones stand out in the list.
  game.settings.register(MODULE_ID, SEEN_RECIPES_SETTING, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, HARVEST_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: emptyHarvest(),
    onChange: onHarvestChanged
  });
  game.settings.register(MODULE_ID, PRICE_UNIT_SETTING, {
    name: "SODLTRADE.Settings.PriceUnit.Name",
    hint: "SODLTRADE.Settings.PriceUnit.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: { gc: "SODLTRADE.Wealth.gc", ss: "SODLTRADE.Wealth.ss", cp: "SODLTRADE.Wealth.cp", bits: "SODLTRADE.Wealth.bits" },
    // The system's compendiums write prices in silver shillings.
    default: "ss"
  });
  // One setting per kind of chat message: who sees it, if anyone.
  for (const [key, label, fallback] of [
    [CHAT_TRADES_SETTING, "Trades", "involved"],
    [CHAT_LOOT_SETTING, "Loot", "everyone"],
    [CHAT_SHOP_SETTING, "Shop", "involved"],
    [CHAT_CRAFT_SETTING, "Craft", "involved"]
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
  game.settings.register(MODULE_ID, HARVEST_SCARCITY_SETTING, {
    name: "SODLTRADE.Settings.HarvestScarcity.Name",
    hint: "SODLTRADE.Settings.HarvestScarcity.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(Object.keys(SCARCITY_LEVELS).map((level) => [level, `SODLTRADE.Settings.HarvestScarcity.${level}`])),
    default: "dying",
    onChange: () => TradeHub.refreshAll()
  });
  game.settings.register(MODULE_ID, CRAFT_APPROVAL_SETTING, {
    name: "SODLTRADE.Settings.CraftApproval.Name",
    hint: "SODLTRADE.Settings.CraftApproval.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    // Players create nothing without the GM unless the GM chooses otherwise.
    default: true,
    onChange: () => TradeHub.refreshAll()
  });
  // Extensions (the essence alchemy, for one) add their tabs and requests once the module is set up.
  const api = createApi({ onFeatureToggled });
  game.modules.get(MODULE_ID).api = api;
  Hooks.callAll("sodlTrade.init", api);
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
  const crafting = readCrafting();
  knownCraftOrderIds = new Set((crafting.orders ?? []).map((order) => order.id));
  knownRecipeKeys = recipeKeys(crafting);
  knownHarvestSite = readHarvest().site;
  refreshToolbarBadge();
});

Hooks.on("renderSceneControls", () => refreshToolbarBadge());

Hooks.on("getSceneControlButtons", (controls) => {
  if (!hasAnyTab()) {
    return;
  }
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

// Keeps the ingredients a character owns up to date in the crafting tab.
for (const hook of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, (item) => {
    if (isPlayerCharacter(item.parent)) {
      TradeHub.refreshAll();
    }
  });
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  for (const button of html.querySelectorAll("[data-sodl-trade-open]")) {
    button.addEventListener("click", () => TradeWindow.open(button.dataset.sodlTradeOpen));
  }
  for (const button of html.querySelectorAll("[data-sodl-trade-shop]")) {
    button.addEventListener("click", () => TradeHub.open("shop"));
  }
  for (const button of html.querySelectorAll("[data-sodl-trade-crafting]")) {
    button.addEventListener("click", () => TradeHub.open("crafting"));
  }
  for (const button of html.querySelectorAll("[data-sodl-trade-loot]")) {
    button.addEventListener("click", () => TradeHub.open("loot"));
  }
});
