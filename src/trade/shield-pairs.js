// The demonlord system defines each shield twice: a weapon (to bash with) and an armor flagged
// "isShield" (for the Defense bonus). Both share a name, so they are paired by name and always move together.

function shieldKey(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function isShieldArmor(candidate) {
  return candidate.type === "armor" && candidate.isShield === true;
}

// Candidates are given in order of preference; the first weapon and the first shield armor of each name win.
export function buildShieldIndex(candidates) {
  const index = new Map();
  for (const candidate of candidates) {
    const key = shieldKey(candidate.name);
    const entry = index.get(key) ?? {};
    if (isShieldArmor(candidate) && !entry.armor) {
      entry.armor = candidate.uuid;
    }
    if (candidate.type === "weapon" && !entry.weapon) {
      entry.weapon = candidate.uuid;
    }
    index.set(key, entry);
  }
  return index;
}

export function shieldPartner(index, item) {
  const entry = index.get(shieldKey(item.name));
  if (!entry?.armor) {
    return null;
  }
  if (isShieldArmor(item)) {
    return entry.weapon ?? null;
  }
  if (item.type === "weapon") {
    return entry.armor;
  }
  return null;
}

// Shows each shield once, as its armor, with the matching weapon attached to it.
export function pairInventoryShields(items) {
  const weaponsByName = new Map(items.filter((item) => item.type === "weapon").map((item) => [shieldKey(item.name), item]));
  const linkedWeaponIds = new Set();
  const paired = items.map((item) => {
    const weapon = weaponsByName.get(shieldKey(item.name));
    if (!isShieldArmor(item) || !weapon) {
      return { ...item, linked: [] };
    }
    linkedWeaponIds.add(weapon.id);
    return { ...item, linked: [{ id: weapon.id, quantity: weapon.quantity }] };
  });
  return paired.filter((item) => !linkedWeaponIds.has(item.id));
}
