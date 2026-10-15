import { pairInventoryShields } from "./shield-pairs.js";
import { toWealth } from "./wealth.js";

export const TRADABLE_TYPES = ["item", "weapon", "armor", "ammo", "relic"];

// Same split as the character sheet: weapons, armor and ammo live under "Combat", the rest under "Inventory".
export const COMBAT_TYPES = ["weapon", "armor", "ammo"];
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
    items: pairInventoryShields(actor.items
      .filter((item) => TRADABLE_TYPES.includes(item.type))
      .map((item) => ({ id: item.id, name: item.name, img: item.img, type: item.type, isShield: item.system.isShield === true, quantity: toQuantity(item.system.quantity) })))
  };
}

// Where an owned item was copied from, so an ingredient renamed by its owner is still recognised.
function sourceUuidsOf(item) {
  return [item._stats?.compendiumSource, item._stats?.duplicateSource, item.flags?.core?.sourceId].filter(Boolean);
}

// Item types that describe the character rather than their belongings, checked by recipe requirements.
const TRAIT_TYPES = ["profession", "path", "talent", "ancestry"];

export function toCraftingInventory(actor) {
  return {
    wealth: toWealth(actor.system.wealth),
    traits: actor.items
      .filter((item) => TRAIT_TYPES.includes(item.type))
      .map((item) => ({ name: item.name, sourceUuids: sourceUuidsOf(item) })),
    items: actor.items
      .filter((item) => TRADABLE_TYPES.includes(item.type))
      .map((item) => ({ id: item.id, name: item.name, sourceUuids: sourceUuidsOf(item), quantity: toQuantity(item.system.quantity) }))
  };
}

// The laboratory's view of a character: their gear (with what kind of consumable it is), their purse and their spells.
export function toLabInventory(actor) {
  const crafting = toCraftingInventory(actor);
  const gear = actor.items.filter((item) => TRADABLE_TYPES.includes(item.type));
  return {
    ...crafting,
    items: crafting.items.map((entry) => {
      const item = gear.find((candidate) => candidate.id === entry.id);
      return {
        ...entry,
        img: item.img,
        consumableType: item.system.consumabletype ?? "",
        resourceKey: item.flags?.["sodl-trade"]?.resource ?? null,
        description: item.system.description ?? "",
        value: item.system.value,
        contents: item.system.contents ?? []
      };
    }),
    spells: actor.items
      .filter((item) => item.type === "spell")
      .map((item) => ({ id: item.id, name: item.name, img: item.img, rank: Number(item.system.rank) || 0, tradition: item.system.tradition ?? "", system: { castings: item.system.castings } }))
  };
}

// A character's gear seen as resources: the catalog resource each item was created from, its sources and its quantity.
export function toResourceInventory(actor) {
  return actor.items
    .filter((item) => TRADABLE_TYPES.includes(item.type))
    .map((item) => ({ id: item.id, name: item.name, img: item.img, resourceKey: item.flags?.["sodl-trade"]?.resource ?? null, sourceUuids: sourceUuidsOf(item), quantity: toQuantity(item.system.quantity) }));
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
