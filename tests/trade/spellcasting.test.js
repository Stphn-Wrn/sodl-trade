import { test } from "node:test";
import assert from "node:assert/strict";
import { BOOK_SPELLS, castingUpdate, findSpell } from "../../src/trade/spellcasting.js";

test("un sort des livres est retrouvé sur la fiche par son nom anglais ou français, sans tenir compte des majuscules", () => {
  const spells = [
    { id: "s1", name: "Lumière", system: { castings: { value: 0, max: 2 } } },
    { id: "s2", name: "identify substance", system: { castings: { value: 0, max: 2 } } }
  ];

  assert.equal(findSpell(spells, BOOK_SPELLS.identifySubstance).id, "s2");
  assert.equal(findSpell(spells, BOOK_SPELLS.brewPotion), null);
});

test("lancer un sort dépense un de ses lancers, comme sur la fiche du système", () => {
  const spell = { id: "s1", name: "Brew Potion", system: { castings: { value: 1, max: 3 } } };

  assert.deepEqual(castingUpdate(spell), { _id: "s1", "system.castings.value": 2 });
});

test("un sort dont tous les lancers sont dépensés ne peut plus être lancé avant un repos ; un maximum à zéro ne compte pas", () => {
  const spent = { id: "s1", name: "Brew Potion", system: { castings: { value: 2, max: 2 } } };
  const untracked = { id: "s2", name: "Brew Potion", system: { castings: { value: 5, max: 0 } } };

  assert.throws(() => castingUpdate(spent), (err) => err.message === "SODLTRADE.Errors.NoCastingLeft" && err.data.name === "Brew Potion");
  assert.deepEqual(castingUpdate(untracked), { _id: "s2", "system.castings.value": 6 });
});
