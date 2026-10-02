import { toWealth } from "./wealth.js";

export const TRADABLE_TYPES = ["item", "weapon", "armor", "ammo", "relic"];
export const GM_ROLE = "gm";

function toQuantity(value) {
  const number = Math.trunc(Number(value));
  if (value === null || value === undefined || !Number.isFinite(number)) {
    return 1;
  }
  return Math.max(0, number);
}

// Quantity an item comes with when copied from its source, such as a bundle of 20 arrows.
export function sourceQuantity(data) {
  const quantity = Math.trunc(Number(data.system?.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }
  return quantity;
}

export function toInventory(actor) {
  return {
    wealth: toWealth(actor.system.wealth),
    items: actor.items
      .filter((item) => TRADABLE_TYPES.includes(item.type))
      .map((item) => ({ id: item.id, name: item.name, img: item.img, quantity: toQuantity(item.system.quantity) }))
  };
}

export function resolveRole(trade, user, ownsActor) {
  if (user.isGM) {
    return GM_ROLE;
  }
  const index = trade.parties.findIndex((party) => ownsActor(party.actorId));
  if (index < 0) {
    return null;
  }
  return index;
}

const OWNER_LEVEL = 3;

// The party is made of characters assigned to a player or explicitly owned by one.
// Ownership granted to everyone by default (shared tokens, map markers) does not count.
export function isPartyCharacter(actor, playerIds, assignedIds) {
  if (actor.type !== "character") {
    return false;
  }
  if (assignedIds.includes(actor.id)) {
    return true;
  }
  return playerIds.some((userId) => (actor.ownership?.[userId] ?? 0) >= OWNER_LEVEL);
}
