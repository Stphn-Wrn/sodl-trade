// Every part of the module can be turned off by the GM; each has a world setting named "<feature>Enabled".
export const FEATURES = ["trades", "loot", "shop", "crafting", "harvest"];

const REQUEST_FEATURES = { create: "trades", act: "trades", loot: "loot", shop: "shop", crafting: "crafting", harvest: "harvest" };

export function featureSetting(feature) {
  return `${feature}Enabled`;
}

export function featureOfRequest(type) {
  return REQUEST_FEATURES[type] ?? null;
}
