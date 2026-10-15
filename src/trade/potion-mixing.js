import { LocalizedError } from "../shared/i18n.js";

// Demon Lord's Companion, Mixing Potions: the GM rolls 3d6 when potions are poured into one another.
const MIXING_TABLE = [
  { min: 18, outcome: "transformed" },
  { min: 16, outcome: "doubled" },
  { min: 13, outcome: "combined" },
  { min: 9, outcome: "oneFades" },
  { min: 6, outcome: "allFade" },
  { min: 4, outcome: "poison" },
  { min: 3, outcome: "explosion" }
];

export const MIXING_ROLL = "3d6";
export const EXPLOSION_DAMAGE = "5d6";

// The potion's magic is gone or it blew up: nothing is left to keep.
const NOTHING_LEFT = ["allFade", "explosion"];
// These keep the potions' own effects, so their descriptions go along.
const KEEPS_EFFECTS = ["doubled", "combined", "oneFades"];

const POTION_TYPE = "P";
const POISON_TYPE = "V";
const POISON_ICON = "icons/consumables/potions/bottle-conical-corked-labeled-skull-poison-green.webp";
const POTION_WORDS = ["potion", "philtre", "elixir"];

export function mixingOutcome(total) {
  return MIXING_TABLE.find((entry) => total >= entry.min)?.outcome ?? "explosion";
}

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function isPotion(item) {
  if (item.consumableType === POTION_TYPE) {
    return true;
  }
  const name = normalizeName(item.name);
  return POTION_WORDS.some((word) => name.includes(word));
}

// One dose of each potion is poured; two doses of the same stack can be mixed too.
export function planMix({ itemIds, items }) {
  const potions = itemIds.map((itemId) => items.find((item) => item.id === itemId));
  if (potions.length !== 2 || potions.some((item) => !item)) {
    throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: "" });
  }
  const notPotion = potions.find((item) => !isPotion(item));
  if (notPotion) {
    throw new LocalizedError("SODLTRADE.Errors.NotAPotion", { name: notPotion.name });
  }
  const plan = { deleteItemIds: [], updateItems: [] };
  for (const item of new Set(potions)) {
    const used = potions.filter((entry) => entry === item).length;
    if (item.quantity < used) {
      throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: item.name });
    }
    if (item.quantity === used) {
      plan.deleteItemIds.push(item.id);
    } else {
      plan.updateItems.push({ _id: item.id, "system.quantity": item.quantity - used });
    }
  }
  return { potions, plan };
}

function describeMixture(outcome, potions, t) {
  const parts = [`<p><strong>${t(`SODLTRADE.Lab.Mix.Outcome.${outcome}`)}</strong></p>`];
  if (KEEPS_EFFECTS.includes(outcome)) {
    for (const potion of potions) {
      parts.push(`<p><em>${potion.name}</em></p>`, potion.description ?? "");
    }
  }
  return parts.join("");
}

// What is left in the vial, or null when the mixture blew up or lost all its magic.
export function mixtureItemData(outcome, potions, t) {
  if (NOTHING_LEFT.includes(outcome)) {
    return null;
  }
  const names = potions.map((potion) => potion.name).join(" + ");
  let consumabletype = POTION_TYPE;
  let img = potions[0].img;
  if (outcome === "poison") {
    consumabletype = POISON_TYPE;
    img = POISON_ICON;
  }
  return {
    name: t(`SODLTRADE.Lab.Mix.Item.${outcome}`),
    type: "item",
    img,
    system: { consumabletype, description: `<p>${names}</p>${describeMixture(outcome, potions, t)}`, quantity: 1 },
    flags: { "sodl-trade": { mixture: { outcome, potions: potions.map((potion) => potion.name) } } }
  };
}
