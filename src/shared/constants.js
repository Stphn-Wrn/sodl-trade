export const MODULE_ID = "sodl-trade";
export const TRADES_SETTING = "trades";
export const SOCKET_CHANNEL = `module.${MODULE_ID}`;

export function modulePath(relativePath) {
  return `modules/${MODULE_ID}/${relativePath}`;
}
