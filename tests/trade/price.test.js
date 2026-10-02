import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice } from "../../src/trade/price.js";

test("un prix se lit avec les abréviations anglaises ou françaises, même combinées", () => {
  assert.deepEqual(parsePrice("5 ss", "ss"), { gc: 0, ss: 5, cp: 0, bits: 0 });
  assert.deepEqual(parsePrice("1 CO 5 CA", "ss"), { gc: 1, ss: 5, cp: 0, bits: 0 });
  assert.deepEqual(parsePrice("3 sc, 2 écl.", "ss"), { gc: 0, ss: 0, cp: 3, bits: 2 });
  assert.deepEqual(parsePrice("2 gc", "ss"), { gc: 2, ss: 0, cp: 0, bits: 0 });
});

test("un nombre seul est compté dans l'unité par défaut choisie par le MJ", () => {
  assert.deepEqual(parsePrice("10", "cp"), { gc: 0, ss: 0, cp: 10, bits: 0 });
  assert.deepEqual(parsePrice(5, "ss"), { gc: 0, ss: 5, cp: 0, bits: 0 });
});

test("un prix vide ou illisible reste à fixer par le MJ", () => {
  assert.equal(parsePrice("", "ss"), null);
  assert.equal(parsePrice("—", "ss"), null);
  assert.equal(parsePrice("5 dragons", "ss"), null);
  assert.equal(parsePrice(undefined, "ss"), null);
});
