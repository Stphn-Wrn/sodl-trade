import { LocalizedError } from "../shared/i18n.js";
import { matchesIngredient } from "./craft-plan.js";
import { fromBits, payWithChange, toBits } from "./wealth.js";

// Core rulebook, Incantations table: price and availability by spell rank, in silver shillings like the compendiums.
// Ranks 7 and up need the GM's permission; the system files them as exotic.
const INCANTATIONS = [
  { ss: 1, availability: "U" },
  { ss: 5, availability: "U" },
  { ss: 10, availability: "R" },
  { ss: 50, availability: "R" },
  { ss: 100, availability: "E" },
  { ss: 500, availability: "E" },
  { ss: 1000, availability: "E" },
  { ss: 2500, availability: "E" },
  { ss: 5000, availability: "E" },
  { ss: 10000, availability: "E" },
  { ss: 50000, availability: "E" }
];

const BITS_PER_SS = 100;
export const WRITING_KIT_NAMES = ["Writing kit", "Kit d’écriture", "Kit d'écriture"];

function entryOf(rank) {
  const index = Math.min(Math.max(Math.trunc(Number(rank)) || 0, 0), INCANTATIONS.length - 1);
  return INCANTATIONS[index];
}

export function incantationPrice(rank) {
  return fromBits(entryOf(rank).ss * BITS_PER_SS);
}

// "Special inks worth at least half the incantation's price."
export function inkCost(rank) {
  return fromBits(Math.ceil(toBits(incantationPrice(rank)) / 2));
}

export function hasWritingKit(inventory) {
  return inventory.items.some((item) => WRITING_KIT_NAMES.some((name) => matchesIngredient(item, { name })));
}

// Creating or copying an incantation: a writing kit, the inks, and an hour of work.
export function planIncantation({ rank, inventory }) {
  if (!hasWritingKit(inventory)) {
    throw new LocalizedError("SODLTRADE.Errors.MissingTool", { name: WRITING_KIT_NAMES[0] });
  }
  const wealth = payWithChange(inventory.wealth, inkCost(rank));
  if (!wealth) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
  }
  return { wealth };
}

// The same consumable the system makes when a spell is dropped in the inventory, so it is read aloud from the sheet.
export function incantationItemData(spell, label) {
  const entry = entryOf(spell.system?.rank);
  return {
    name: `${label}: ${spell.name}`,
    type: "item",
    img: spell.img,
    system: { consumabletype: "I", description: spell.system?.description ?? "", availability: entry.availability, value: String(entry.ss), quantity: 1, contents: [spell] }
  };
}
