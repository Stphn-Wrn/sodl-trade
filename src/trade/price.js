import { emptyWealth } from "./wealth.js";

const UNIT_ALIASES = {
  gc: ["gc", "co", "couronne", "couronnes", "crown", "crowns"],
  ss: ["ss", "ca", "sa", "shilling", "shillings"],
  cp: ["cp", "sc", "penny", "pennies", "sou", "sous"],
  bits: ["bit", "bits", "ecl", "eclat", "eclats"]
};

function resolveUnit(word, defaultUnit) {
  if (word === "") {
    return defaultUnit;
  }
  const match = Object.entries(UNIT_ALIASES).find(([, aliases]) => aliases.includes(word));
  if (!match) {
    return null;
  }
  return match[0];
}

function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,;]/g, " ")
    .trim();
}

// Reads a price written by hand or stored in the item's "value" field, such as "1 gc 5 ss", "3 CA" or "10".
// Returns null when the price cannot be read, so the GM has to set it before the item can be bought.
export function parsePrice(text, defaultUnit) {
  const normalized = normalize(text);
  if (!/^(\d+\s*[a-z]*\s*)+$/.test(normalized)) {
    return null;
  }
  const price = emptyWealth();
  for (const [, amount, word] of normalized.matchAll(/(\d+)\s*([a-z]*)/g)) {
    const unit = resolveUnit(word, defaultUnit);
    if (!unit) {
      return null;
    }
    price[unit] += Number(amount);
  }
  return price;
}
