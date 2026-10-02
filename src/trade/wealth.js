export const DENOMINATIONS = ["gc", "ss", "cp", "bits"];

// Core rulebook rates: 1 gc = 10 ss = 100 cp = 1000 bits.
const BITS_PER_COIN = { gc: 1000, ss: 100, cp: 10, bits: 1 };

function toCoins(value) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }
  return number;
}

function combine(compute) {
  return Object.fromEntries(DENOMINATIONS.map((denomination) => [denomination, compute(denomination)]));
}

export function toWealth(raw) {
  return combine((denomination) => toCoins(raw?.[denomination]));
}

export function emptyWealth() {
  return toWealth({});
}

export function isEmptyWealth(wealth) {
  return DENOMINATIONS.every((denomination) => wealth[denomination] === 0);
}

export function coversWealth(owned, wanted) {
  return DENOMINATIONS.every((denomination) => owned[denomination] >= wanted[denomination]);
}

export function settleWealth(owned, given, received) {
  return combine((denomination) => owned[denomination] - given[denomination] + received[denomination]);
}

export function toBits(wealth) {
  return DENOMINATIONS.reduce((total, denomination) => total + wealth[denomination] * BITS_PER_COIN[denomination], 0);
}

export function fromBits(total) {
  let rest = total;
  return combine((denomination) => {
    const coins = Math.floor(rest / BITS_PER_COIN[denomination]);
    rest -= coins * BITS_PER_COIN[denomination];
    return coins;
  });
}

export function multiplyWealth(wealth, factor) {
  return combine((denomination) => wealth[denomination] * factor);
}

// Pays a merchant who makes change: the buyer keeps as many of their own coins as possible
// and receives the change in the largest coins.
export function payWithChange(owned, cost) {
  let remaining = toBits(owned) - toBits(cost);
  if (remaining < 0) {
    return null;
  }
  const kept = combine((denomination) => {
    const coins = Math.min(owned[denomination], Math.floor(remaining / BITS_PER_COIN[denomination]));
    remaining -= coins * BITS_PER_COIN[denomination];
    return coins;
  });
  return settleWealth(kept, emptyWealth(), fromBits(remaining));
}
