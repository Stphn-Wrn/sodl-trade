export const MODULE_ID = "sodl-trade";
export const TRADES_SETTING = "trades";
export const LOOT_SETTING = "loot";
export const SHOP_SETTING = "shop";
export const PRICE_UNIT_SETTING = "defaultPriceUnit";
export const CHAT_TRADES_SETTING = "chatTrades";
export const CHAT_LOOT_SETTING = "chatLoot";
export const CHAT_SHOP_SETTING = "chatShop";
export const SHOP_APPROVAL_SETTING = "requireShopApproval";
export const CRAFTING_SETTING = "crafting";
export const CRAFT_APPROVAL_SETTING = "requireCraftApproval";
export const CHAT_CRAFT_SETTING = "chatCraft";
export const HARVEST_SETTING = "harvest";
export const HARVEST_SCARCITY_SETTING = "harvestScarcity";
export const SOCKET_CHANNEL = `module.${MODULE_ID}`;

export function modulePath(relativePath) {
  return `modules/${MODULE_ID}/${relativePath}`;
}
