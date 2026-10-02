import { emptyWealth, fromBits, toBits } from "./wealth.js";

const UNIT_ALIASES = {
  gc: ["gc", "co", "couronne", "couronnes", "crown", "crowns"],
  ss: ["ss", "ca", "sa", "shilling", "shillings"],
  cp: ["cp", "sc", "penny", "pennies", "sou", "sous"],
  bits: ["bit", "bits", "ecl", "eclat", "eclats"]
};

const AMOUNT = "\\d+(?:\\.\\d+)?";

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

// "0,5" is a decimal comma, while "1 CO, 5 CA" separates two amounts; a dot only stays when it is a decimal point.
function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\.(?!\d)/g, " ")
    .replace(/[,;]/g, " ")
    .trim();
}

// Reads a price written by hand or stored in the item's "value" field, such as "1 gc 5 ss", "3 CA", "0.5" or "10".
// The amount is converted to its value and returned in the largest coins, so "0.5 gc" becomes 5 ss.
// Returns null when the price cannot be read, so the GM has to set it before the item can be bought.
export function parsePrice(text, defaultUnit) {
  const normalized = normalize(text);
  if (!new RegExp(`^(${AMOUNT}\\s*[a-z]*\\s*)+$`).test(normalized)) {
    return null;
  }
  let total = 0;
  for (const [, amount, word] of normalized.matchAll(new RegExp(`(${AMOUNT})\\s*([a-z]*)`, "g"))) {
    const unit = resolveUnit(word, defaultUnit);
    if (!unit) {
      return null;
    }
    total += toBits({ ...emptyWealth(), [unit]: Number(amount) });
  }
  return fromBits(Math.round(total));
}
