export const MODULE_ID = "sodl-trade";
export const TRADES_SETTING = "trades";
export const LOOT_SETTING = "loot";
export const SHOP_SETTING = "shop";
export const PRICE_UNIT_SETTING = "defaultPriceUnit";
export const SOCKET_CHANNEL = `module.${MODULE_ID}`;

export function modulePath(relativePath) {
  return `modules/${MODULE_ID}/${relativePath}`;
}
