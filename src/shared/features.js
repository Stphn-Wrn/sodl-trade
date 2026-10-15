import { extensions } from "./extensions.js";

// Every part of the module can be turned off by the GM; each has a world setting named "<feature>Enabled".
export const FEATURES = ["trades", "loot", "shop", "crafting", "harvest"];

// The laboratory (incantations, potion spells, mixing) follows the books' crafting rules, so it goes with crafting.
const REQUEST_FEATURES = { create: "trades", act: "trades", loot: "loot", shop: "shop", crafting: "crafting", lab: "crafting", harvest: "harvest" };

// What a player creates outside a recipe; when the GM validates crafting, it waits for their approval too.
const CREATION_ACTIONS = { lab: ["writeIncantation", "copyIncantation", "brew", "mix"] };

function creationActions(type, registry) {
  return CREATION_ACTIONS[type] ?? registry.request(type)?.approvalActions ?? [];
}

export function needsApproval(request, { isGM, requireApproval }, registry = extensions) {
  if (isGM || !requireApproval) {
    return false;
  }
  return creationActions(request.type, registry).includes(request.data?.action?.type);
}

// The core's requests go through the GM; an extension may run one that only touches the player's own character on their client.
export function runsOnOwnClient(type, registry = extensions) {
  return Boolean(registry.request(type)?.ownClient);
}

export function featureSetting(feature) {
  return `${feature}Enabled`;
}

export function featureOfRequest(type) {
  return REQUEST_FEATURES[type] ?? null;
}
