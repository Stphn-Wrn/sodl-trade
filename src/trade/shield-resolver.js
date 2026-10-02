import { buildShieldIndex, shieldPartner } from "./shield-pairs.js";

const SHIELD_TYPES = ["weapon", "armor"];

function toCandidate(item) {
  return { uuid: item.uuid, name: item.name, type: item.type, isShield: item.system?.isShield === true };
}

async function compendiumCandidates() {
  const candidates = [];
  for (const pack of game.packs.filter((entry) => entry.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["system.isShield"] });
    for (const entry of index) {
      if (SHIELD_TYPES.includes(entry.type)) {
        candidates.push(toCandidate(entry));
      }
    }
  }
  return candidates;
}

// Looks for the other half of a shield: first among the given items (same sheet or same folder),
// then in the world's items, then in the compendiums. Built once per drop or import.
export async function createShieldResolver(nearbyItems = []) {
  const candidates = [
    ...nearbyItems.map(toCandidate),
    ...game.items.map(toCandidate),
    ...(await compendiumCandidates())
  ].filter((candidate) => SHIELD_TYPES.includes(candidate.type));
  const index = buildShieldIndex(candidates);

  return async (item) => {
    const uuid = shieldPartner(index, toCandidate(item));
    if (!uuid || uuid === item.uuid) {
      return null;
    }
    return fromUuid(uuid);
  };
}

export function nearbyItemsOf(item) {
  if (item.parent?.items) {
    return [...item.parent.items];
  }
  return [];
}
