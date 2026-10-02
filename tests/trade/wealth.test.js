import { test } from "node:test";
import assert from "node:assert/strict";
import { coversWealth, payWithChange, settleWealth, toWealth } from "../../src/trade/wealth.js";

test("la richesse du système est lue en entiers positifs, les valeurs absentes valant zéro", () => {
  const raw = { gc: "3", ss: 2.7, cp: -4 };

  assert.deepEqual(toWealth(raw), { gc: 3, ss: 2, cp: 0, bits: 0 });
});

test("une bourse couvre une offre seulement si chaque pièce est disponible, sans faire de monnaie", () => {
  const owned = { gc: 1, ss: 20, cp: 0, bits: 0 };

  assert.equal(coversWealth(owned, { gc: 1, ss: 5, cp: 0, bits: 0 }), true);
  assert.equal(coversWealth(owned, { gc: 0, ss: 0, cp: 1, bits: 0 }), false);
});

test("après l'échange, chacun perd ce qu'il donne et gagne ce qu'il reçoit", () => {
  const owned = { gc: 2, ss: 3, cp: 4, bits: 5 };
  const given = { gc: 1, ss: 0, cp: 4, bits: 0 };
  const received = { gc: 0, ss: 7, cp: 0, bits: 1 };

  assert.deepEqual(settleWealth(owned, given, received), { gc: 1, ss: 10, cp: 0, bits: 6 });
});

test("payer chez un marchand qui rend la monnaie garde au maximum les pièces de l'acheteur", () => {
  assert.deepEqual(payWithChange({ gc: 1, ss: 0, cp: 0, bits: 0 }, { gc: 0, ss: 5, cp: 0, bits: 0 }), { gc: 0, ss: 5, cp: 0, bits: 0 });
  assert.deepEqual(payWithChange({ gc: 0, ss: 10, cp: 5, bits: 0 }, { gc: 0, ss: 0, cp: 3, bits: 0 }), { gc: 0, ss: 10, cp: 2, bits: 0 });
  assert.deepEqual(payWithChange({ gc: 2, ss: 0, cp: 0, bits: 7 }, { gc: 0, ss: 0, cp: 1, bits: 0 }), { gc: 1, ss: 9, cp: 9, bits: 7 });
});

test("un acheteur trop pauvre ne peut pas payer", () => {
  assert.equal(payWithChange({ gc: 0, ss: 4, cp: 9, bits: 9 }, { gc: 0, ss: 5, cp: 0, bits: 0 }), null);
});
