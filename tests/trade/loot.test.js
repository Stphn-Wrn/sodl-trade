import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLootAction, canAccessLoot, emptyLoot, splitWealth } from "../../src/trade/loot.js";

function sword(quantity) {
  return { name: "Épée", img: "s.webp", type: "weapon", system: { quantity, wear: true } };
}

function lootWith(items, wealth) {
  return { items: items.map((item) => ({ revealed: true, ...item })), wealth: { gc: 0, ss: 0, cp: 0, bits: 0, ...wealth }, wealthRevealed: true, open: true };
}

function gm(loot, action) {
  return applyLootAction(loot, action, { isGM: true, ownsActor: () => false });
}

function player(loot, action) {
  return applyLootAction(loot, action, { isGM: false, ownsActor: (actorId) => actorId === "a" });
}

test("le MJ dépose un objet trouvé, caché aux joueurs, à la quantité de l'objet d'origine", () => {
  const { loot } = gm(emptyLoot(), { type: "add", id: "l1", sourceUuid: "Actor.orc.Item.s", data: sword(2) });

  assert.deepEqual(loot.items, [{ id: "l1", sourceUuid: "Actor.orc.Item.s", name: "Épée", img: "s.webp", quantity: 2, revealed: false, data: sword(2), linked: [] }]);
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

test("les récompenses sont fermées par défaut, et seul le MJ les ouvre ou les ferme", () => {
  assert.equal(emptyLoot().open, false);

  const opened = gm(emptyLoot(), { type: "setOpen", open: true });
  assert.equal(opened.loot.open, true);
  assert.equal(opened.event, "opened");

  assert.equal(gm(opened.loot, { type: "setOpen", open: false }).loot.open, false);
  assert.throws(() => player(emptyLoot(), { type: "setOpen", open: true }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("tant que les récompenses sont fermées, un joueur ne peut rien prendre", () => {
  const closed = { ...lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1) }], { gc: 1 }), open: false };

  assert.throws(() => player(closed, { type: "take", actorId: "a", id: "l1", quantity: 1 }), { message: "SODLTRADE.Errors.LootClosed" });
  assert.throws(() => player(closed, { type: "takeWealth", actorId: "a", wealth: { gc: 1 } }), { message: "SODLTRADE.Errors.LootClosed" });
});

test("le MJ dévoile les trésors un par un, ou tous d'un coup avec l'argent", () => {
  const prepared = { ...lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1), revealed: false }, { id: "l2", sourceUuid: "y", name: "Bouclier", img: "b.webp", quantity: 1, data: sword(1), revealed: false }], { gc: 3 }), wealthRevealed: false };

  const one = gm(prepared, { type: "setRevealed", id: "l1", revealed: true });
  assert.deepEqual(one.loot.items.map((item) => item.revealed), [true, false]);
  assert.equal(one.event, "revealed");
  assert.deepEqual(one.revealed, { items: [{ name: "Épée", quantity: 1 }], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } });

  const coins = gm(prepared, { type: "setWealthRevealed", revealed: true });
  assert.equal(coins.loot.wealthRevealed, true);
  assert.deepEqual(coins.revealed, { items: [], wealth: { gc: 3, ss: 0, cp: 0, bits: 0 } });

  const all = gm(one.loot, { type: "revealAll" });
  assert.deepEqual(all.loot.items.map((item) => item.revealed), [true, true]);
  assert.equal(all.loot.wealthRevealed, true);
  assert.deepEqual(all.revealed, { items: [{ name: "Bouclier", quantity: 1 }], wealth: { gc: 3, ss: 0, cp: 0, bits: 0 } });
});

test("cacher à nouveau un trésor ne l'annonce pas", () => {
  const loot = lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1) }], {});

  const hidden = gm(loot, { type: "setRevealed", id: "l1", revealed: false });

  assert.equal(hidden.loot.items[0].revealed, false);
  assert.equal(hidden.event, null);
});

test("un joueur ne peut pas prendre un trésor encore caché", () => {
  const loot = { ...lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1), revealed: false }], { gc: 1 }), wealthRevealed: false };

  assert.throws(() => player(loot, { type: "take", actorId: "a", id: "l1", quantity: 1 }), { message: "SODLTRADE.Errors.LootGone" });
  assert.throws(() => player(loot, { type: "takeWealth", actorId: "a", wealth: { gc: 1 } }), { message: "SODLTRADE.Errors.NotEnoughWealth" });
});

test("dévoiler un trésor pendant que les récompenses sont fermées ne l'annonce pas encore", () => {
  const closed = { ...lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 1, data: sword(1), revealed: false }], {}), open: false };

  const result = gm(closed, { type: "setRevealed", id: "l1", revealed: true });

  assert.equal(result.loot.items[0].revealed, true);
  assert.equal(result.event, null);
});

test("prendre un bouclier dans le butin donne aussi sa version arme, à la même quantité", () => {
  const armor = { name: "Petit Bouclier", img: "a.webp", type: "armor", system: { quantity: 1, isShield: true } };
  const weapon = { name: "Petit bouclier", img: "w.webp", type: "weapon", system: { quantity: 1 } };
  let loot = { ...gm(emptyLoot(), { type: "add", id: "l1", sourceUuid: "A.shield", data: armor, linked: [weapon] }).loot, open: true };
  loot = gm(loot, { type: "setRevealed", id: "l1", revealed: true }).loot;

  const result = player(loot, { type: "take", actorId: "a", id: "l1", quantity: 1 });

  assert.deepEqual(result.grants[0].items, [{ data: armor, quantity: 1 }, { data: weapon, quantity: 1 }]);
});

test("par défaut les récompenses s'adressent à tout le groupe, et le MJ peut les réserver à certains personnages", () => {
  assert.deepEqual(emptyLoot().audience, []);

  const restricted = gm(emptyLoot(), { type: "setAudience", actorIds: ["a", "a", "c"] }).loot;
  assert.deepEqual(restricted.audience, ["a", "c"]);

  assert.deepEqual(gm(restricted, { type: "setAudience", actorIds: [] }).loot.audience, []);
  assert.throws(() => player(emptyLoot(), { type: "setAudience", actorIds: ["a"] }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("un personnage hors de la sélection ne peut rien prendre", () => {
  const loot = { ...lootWith([{ id: "l1", sourceUuid: "x", name: "Épée", img: "s.webp", quantity: 2, data: sword(2) }], { gc: 2 }), audience: ["c"] };
  const owner = (loot, action) => applyLootAction(loot, action, { isGM: false, ownsActor: () => true });

  assert.throws(() => owner(loot, { type: "take", actorId: "a", id: "l1", quantity: 1 }), { message: "SODLTRADE.Errors.LootClosed" });
  assert.throws(() => owner(loot, { type: "takeWealth", actorId: "a", wealth: { gc: 1 } }), { message: "SODLTRADE.Errors.LootClosed" });
  assert.equal(owner(loot, { type: "take", actorId: "c", id: "l1", quantity: 1 }).loot.items[0].quantity, 1);
});

test("un personnage a accès aux récompenses si elles sont ouvertes et qu'il fait partie de la sélection, ou qu'il n'y en a pas", () => {
  assert.equal(canAccessLoot({ open: false, audience: [] }, ["a"]), false);
  assert.equal(canAccessLoot({ open: true, audience: [] }, ["a"]), true);
  assert.equal(canAccessLoot({ open: true, audience: ["c"] }, ["a", "b"]), false);
  assert.equal(canAccessLoot({ open: true, audience: ["c"] }, ["a", "c"]), true);
});
