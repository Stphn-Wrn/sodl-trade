import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShieldIndex, pairInventoryShields, shieldPartner } from "../../src/trade/shield-pairs.js";

test("l'arme et l'armure d'un bouclier sont reconnues par leur nom, sans tenir compte des majuscules ni des accents", () => {
  const index = buildShieldIndex([
    { uuid: "W.small", name: "Petit bouclier", type: "weapon", isShield: false },
    { uuid: "A.small", name: "Petit Bouclier", type: "armor", isShield: true },
    { uuid: "W.sword", name: "Épée", type: "weapon", isShield: false }
  ]);

  assert.equal(shieldPartner(index, { uuid: "A.small", name: "Petit Bouclier", type: "armor", isShield: true }), "W.small");
  assert.equal(shieldPartner(index, { uuid: "W.small", name: "petit BOUCLIER", type: "weapon", isShield: false }), "A.small");
});

test("une arme ou une armure qui n'est pas un bouclier n'a pas de partenaire", () => {
  const index = buildShieldIndex([
    { uuid: "W.sword", name: "Épée", type: "weapon", isShield: false },
    { uuid: "A.sword", name: "Épée", type: "armor", isShield: false },
    { uuid: "A.mail", name: "Cotte de mailles", type: "armor", isShield: false }
  ]);

  assert.equal(shieldPartner(index, { uuid: "W.sword", name: "Épée", type: "weapon", isShield: false }), null);
  assert.equal(shieldPartner(index, { uuid: "A.mail", name: "Cotte de mailles", type: "armor", isShield: false }), null);
});

test("le premier candidat trouvé l'emporte, pour préférer la même fiche au monde et le monde aux compendiums", () => {
  const index = buildShieldIndex([
    { uuid: "Actor.orc.W", name: "Grand bouclier", type: "weapon", isShield: false },
    { uuid: "Compendium.W", name: "Grand bouclier", type: "weapon", isShield: false },
    { uuid: "Compendium.A", name: "Grand bouclier", type: "armor", isShield: true }
  ]);

  assert.equal(shieldPartner(index, { uuid: "Compendium.A", name: "Grand bouclier", type: "armor", isShield: true }), "Actor.orc.W");
});

test("dans un inventaire, la paire n'apparaît qu'une fois, sous sa version armure, avec l'arme liée", () => {
  const items = [
    { id: "w", name: "Petit bouclier", img: "w.webp", type: "weapon", isShield: false, quantity: 1 },
    { id: "a", name: "Petit Bouclier", img: "a.webp", type: "armor", isShield: true, quantity: 1 },
    { id: "s", name: "Épée", img: "s.webp", type: "weapon", isShield: false, quantity: 1 }
  ];

  assert.deepEqual(pairInventoryShields(items), [
    { id: "a", name: "Petit Bouclier", img: "a.webp", type: "armor", isShield: true, quantity: 1, linked: [{ id: "w", quantity: 1 }] },
    { id: "s", name: "Épée", img: "s.webp", type: "weapon", isShield: false, quantity: 1, linked: [] }
  ]);
});

test("un bouclier sans sa version arme reste seul dans l'inventaire", () => {
  const items = [{ id: "a", name: "Petit Bouclier", img: "a.webp", type: "armor", isShield: true, quantity: 1 }];

  assert.deepEqual(pairInventoryShields(items), [{ ...items[0], linked: [] }]);
});
