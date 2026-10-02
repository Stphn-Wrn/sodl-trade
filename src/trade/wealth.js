export const DENOMINATIONS = ["gc", "ss", "cp", "bits"];

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
