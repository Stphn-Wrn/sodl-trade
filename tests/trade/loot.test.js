import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLootAction, emptyLoot, splitWealth } from "../../src/trade/loot.js";

function sword(quantity) {
  return { name: "Épée", img: "s.webp", type: "weapon", system: { quantity, wear: true } };
}

function lootWith(items, wealth) {
  return { items, wealth: { gc: 0, ss: 0, cp: 0, bits: 0, ...wealth } };
}

function gm(loot, action) {
  return applyLootAction(loot, action, { isGM: true, ownsActor: () => false });
}

function player(loot, action) {
  return applyLootAction(loot, action, { isGM: false, ownsActor: (actorId) => actorId === "a" });
}

test("le MJ dépose un objet trouvé, à la quantité de l'objet d'origine", () => {
  const { loot } = gm(emptyLoot(), { type: "add", id: "l1", sourceUuid: "Actor.orc.Item.s", data: sword(2) });

  assert.deepEqual(loot.items, [{ id: "l1", sourceUuid: "Actor.orc.Item.s", name: "Épée", img: "s.webp", quantity: 2, data: sword(2) }]);
});

test("déposer deux fois le même objet augmente sa quantité au lieu de créer une seconde ligne", () => {
  let loot = gm(emptyLoot(), { type: "add", id: "l1", sourceUuid: "Item.torch", data: { name: "Torche", img: "t.webp", type: "item", system: { quantity: 1 } } }).loot;
  loot = gm(loot, { type: "add", id: "l2", sourceUuid: "Item.torch", data: { name: "Torche", img: "t.webp", type: "item", system: { quantity: 1 } } }).loot;

  assert.deepEqual(loot.items.map((item) => [item.id, item.quantity]), [["l1", 2]]);
});

test("seul l'équipement peut aller dans les récompenses, pas un sort", () => {
  const spell = { name: "Boule de feu", img: "f.webp", type: "spell", system: {} };

  assert.throws(() => gm(emptyLoot(), { type: "add", id: "l1", sourceUuid: "Item.f", data: spell }), { message: "SODLTRADE.Errors.NotLootable" });
});

test("un joueur prend une partie d'un objet pour son personnage, le reste reste dans le butin", () => {
  const loot = lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 3, data: sword(3) }], {});

  const result = player(loot, { type: "take", actorId: "a", id: "l1", quantity: 2 });

  assert.equal(result.loot.items[0].quantity, 1);
  assert.deepEqual(result.grants, [{ actorId: "a", items: [{ data: sword(3), quantity: 2 }], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } }]);
});

test("prendre le dernier exemplaire retire l'objet du butin", () => {
  const loot = lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1) }], {});

  assert.deepEqual(player(loot, { type: "take", actorId: "a", id: "l1", quantity: 1 }).loot.items, []);
});

test("un joueur ne peut ni prendre plus que le butin ne contient, ni servir le personnage d'un autre", () => {
  const loot = lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1) }], { gc: 1 });

  assert.throws(() => player(loot, { type: "take", actorId: "a", id: "l1", quantity: 2 }), { message: "SODLTRADE.Errors.NotEnoughItems" });
  assert.throws(() => player(loot, { type: "take", actorId: "a", id: "gone", quantity: 1 }), { message: "SODLTRADE.Errors.LootGone" });
  assert.throws(() => player(loot, { type: "takeWealth", actorId: "a", wealth: { gc: 2 } }), { message: "SODLTRADE.Errors.NotEnoughWealth" });
  assert.throws(() => player(loot, { type: "take", actorId: "b", id: "l1", quantity: 1 }), { message: "SODLTRADE.Errors.NotYourCharacter" });
});

test("un joueur prend de l'argent dans le butin", () => {
  const loot = lootWith([], { gc: 2, ss: 4 });

  const result = player(loot, { type: "takeWealth", actorId: "a", wealth: { gc: 1 } });

  assert.deepEqual(result.loot.wealth, { gc: 1, ss: 4, cp: 0, bits: 0 });
  assert.deepEqual(result.grants, [{ actorId: "a", items: [], wealth: { gc: 1, ss: 0, cp: 0, bits: 0 } }]);
});

test("seul le MJ dépose, règle ou partage le butin", () => {
  assert.throws(() => player(emptyLoot(), { type: "setWealth", wealth: { gc: 5 } }), { message: "SODLTRADE.Errors.NotAllowed" });
  assert.throws(() => player(emptyLoot(), { type: "split", actorIds: ["a"] }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("l'argent se partage à parts égales en faisant la monnaie, le reste indivisible reste dans le butin", () => {
  assert.deepEqual(splitWealth({ gc: 1, ss: 0, cp: 0, bits: 0 }, 3), {
    share: { gc: 0, ss: 3, cp: 3, bits: 3 },
    remainder: { gc: 0, ss: 0, cp: 0, bits: 1 }
  });
  assert.deepEqual(splitWealth({ gc: 2, ss: 5, cp: 0, bits: 0 }, 5), {
    share: { gc: 0, ss: 5, cp: 0, bits: 0 },
    remainder: { gc: 0, ss: 0, cp: 0, bits: 0 }
  });
});

test("le MJ partage l'argent du butin entre les personnages choisis", () => {
  const loot = lootWith([], { ss: 7 });

  const result = gm(loot, { type: "split", actorIds: ["a", "b"] });

  assert.deepEqual(result.grants.map((grant) => [grant.actorId, grant.wealth]), [
    ["a", { gc: 0, ss: 3, cp: 5, bits: 0 }],
    ["b", { gc: 0, ss: 3, cp: 5, bits: 0 }]
  ]);
  assert.deepEqual(result.loot.wealth, { gc: 0, ss: 0, cp: 0, bits: 0 });
  assert.throws(() => gm(loot, { type: "split", actorIds: [] }), { message: "SODLTRADE.Errors.NoRecipient" });
  assert.throws(() => gm(emptyLoot(), { type: "split", actorIds: ["a"] }), { message: "SODLTRADE.Errors.NothingToSplit" });
});
