import { test } from "node:test";
import assert from "node:assert/strict";
import { incantationItemData, incantationPrice, inkCost, planIncantation } from "../../src/trade/incantation.js";

function wealth(overrides) {
  return { gc: 0, ss: 0, cp: 0, bits: 0, ...overrides };
}

test("le prix d'une incantation suit la table du livre de base, selon le rang du sort", () => {
  assert.deepEqual([0, 1, 2, 4, 10].map(incantationPrice), [wealth({ ss: 1 }), wealth({ ss: 5 }), wealth({ gc: 1 }), wealth({ gc: 10 }), wealth({ gc: 5000 })]);
});

test("les encres spéciales coûtent la moitié du prix de l'incantation", () => {
  assert.deepEqual([0, 1, 3].map(inkCost), [wealth({ cp: 5 }), wealth({ ss: 2, cp: 5 }), wealth({ gc: 2, ss: 5 })]);
});

test("écrire une incantation demande un kit d'écriture et paie les encres, la monnaie rendue", () => {
  const inventory = { wealth: wealth({ ss: 3 }), items: [{ id: "k", name: "Kit d’écriture", sourceUuids: [], quantity: 1 }] };

  const plan = planIncantation({ rank: 1, inventory });

  assert.deepEqual(plan, { wealth: wealth({ cp: 5 }) });
});

test("sans kit d'écriture, ou sans quoi payer les encres, l'incantation ne s'écrit pas", () => {
  const withoutKit = { wealth: wealth({ gc: 1 }), items: [] };
  const poor = { wealth: wealth({ cp: 1 }), items: [{ id: "k", name: "Writing kit", sourceUuids: [], quantity: 1 }] };

  assert.throws(() => planIncantation({ rank: 0, inventory: withoutKit }), { message: "SODLTRADE.Errors.MissingTool" });
  assert.throws(() => planIncantation({ rank: 0, inventory: poor }), { message: "SODLTRADE.Errors.NotEnoughWealth" });
});

test("l'incantation créée est un consommable du système qui contient le sort, comme quand on glisse un sort dans l'inventaire", () => {
  const spell = { name: "Lumière", type: "spell", img: "s.webp", system: { rank: 2, description: "<p>Éclaire.</p>" } };

  const data = incantationItemData(spell, "Incantation");

  assert.deepEqual(data, {
    name: "Incantation: Lumière",
    type: "item",
    img: "s.webp",
    system: { consumabletype: "I", description: "<p>Éclaire.</p>", availability: "R", value: "10", quantity: 1, contents: [spell] }
  });
});
