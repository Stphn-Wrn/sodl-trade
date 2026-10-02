import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRole, toInventory } from "../../src/trade/inventory.js";

test("l'inventaire échangeable ne garde que l'équipement, pas les sorts, talents ou voies", () => {
  const actor = {
    id: "a",
    system: { wealth: { gc: 1, ss: 2, cp: 3, bits: 4 } },
    items: [
      { id: "i1", name: "Épée", img: "s.webp", type: "weapon", system: { quantity: 1 } },
      { id: "i2", name: "Flèches", img: "f.webp", type: "ammo", system: { quantity: 20 } },
      { id: "i3", name: "Boule de feu", img: "b.webp", type: "spell", system: {} },
      { id: "i4", name: "Corde", img: "c.webp", type: "item", system: { quantity: null } }
    ]
  };

  assert.deepEqual(toInventory(actor), {
    wealth: { gc: 1, ss: 2, cp: 3, bits: 4 },
    items: [
      { id: "i1", name: "Épée", img: "s.webp", quantity: 1 },
      { id: "i2", name: "Flèches", img: "f.webp", quantity: 20 },
      { id: "i4", name: "Corde", img: "c.webp", quantity: 1 }
    ]
  });
});

test("le rôle d'un utilisateur dans l'échange dépend de l'acteur qu'il possède", () => {
  const trade = { parties: [{ actorId: "a" }, { actorId: "b" }] };
  const owns = (owned) => (actorId) => owned.includes(actorId);

  assert.equal(resolveRole(trade, { isGM: true }, owns([])), "gm");
  assert.equal(resolveRole(trade, { isGM: false }, owns(["b"])), 1);
  assert.equal(resolveRole(trade, { isGM: false }, owns(["c"])), null);
});
