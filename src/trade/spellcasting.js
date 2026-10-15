import { LocalizedError } from "../shared/i18n.js";

// Spells of the Demon Lord's Companion's Alchemy tradition, under their book name and their translation.
export const BOOK_SPELLS = {
  identifySubstance: ["Identify Substance", "Identifier une substance"],
  brewPotion: ["Brew Potion", "Préparer une potion"]
};

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function findSpell(spells, names) {
  const wanted = names.map(normalizeName);
  return spells.find((spell) => wanted.includes(normalizeName(spell.name))) ?? null;
}

// The system counts castings used: a spell whose maximum is reached waits for a rest, and a maximum of 0 is not tracked.
export function castingUpdate(spell) {
  const used = Number(spell.system?.castings?.value) || 0;
  const max = Number(spell.system?.castings?.max) || 0;
  if (max !== 0 && used >= max) {
    throw new LocalizedError("SODLTRADE.Errors.NoCastingLeft", { name: spell.name });
  }
  return { _id: spell.id, "system.castings.value": used + 1 };
}
