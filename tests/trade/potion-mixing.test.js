import { test } from "node:test";
import assert from "node:assert/strict";
import { isPotion, mixingOutcome, mixtureItemData, planMix } from "../../src/trade/potion-mixing.js";

test("le résultat d'un mélange suit la table 3d6 du Demon Lord's Companion", () => {
  const totals = [3, 4, 5, 6, 8, 9, 12, 13, 15, 16, 17, 18];

  assert.deepEqual(totals.map(mixingOutcome), ["explosion", "poison", "poison", "allFade", "allFade", "oneFades", "oneFades", "combined", "combined", "doubled", "doubled", "transformed"]);
});

test("une potion est un consommable de type potion du système, ou un objet dont le nom le dit", () => {
  assert.equal(isPotion({ name: "Fiole", consumableType: "P" }), true);
  assert.equal(isPotion({ name: "Potion de soins", consumableType: "" }), true);
  assert.equal(isPotion({ name: "Philtre d'amour", consumableType: "" }), true);
  assert.equal(isPotion({ name: "Corde", consumableType: "" }), false);
});

test("mélanger verse une potion dans l'autre : une dose de chacune est consommée", () => {
  const items = [
    { id: "a", name: "Potion de soins", consumableType: "P", quantity: 2 },
    { id: "b", name: "Potion de vigilance", consumableType: "P", quantity: 1 }
  ];

  const { potions, plan } = planMix({ itemIds: ["a", "b"], items });

  assert.deepEqual(potions.map((potion) => potion.id), ["a", "b"]);
  assert.deepEqual(plan, { deleteItemIds: ["b"], updateItems: [{ _id: "a", "system.quantity": 1 }] });
});

test("deux doses d'une même pile se mélangent aussi, mais il faut deux potions", () => {
  const stack = [{ id: "a", name: "Potion de soins", consumableType: "P", quantity: 2 }];
  const single = [{ id: "a", name: "Potion de soins", consumableType: "P", quantity: 1 }, { id: "r", name: "Corde", consumableType: "", quantity: 1 }];

  assert.deepEqual(planMix({ itemIds: ["a", "a"], items: stack }).plan, { deleteItemIds: ["a"], updateItems: [] });
  assert.throws(() => planMix({ itemIds: ["a", "a"], items: single }), { message: "SODLTRADE.Errors.NotEnoughItems" });
  assert.throws(() => planMix({ itemIds: ["a", "r"], items: single }), { message: "SODLTRADE.Errors.NotAPotion" });
});

test("le mélange obtenu garde la description des potions et dit ce qui leur arrive ; l'explosion et les potions éventées ne laissent rien", () => {
  const potions = [
    { name: "Potion de soins", img: "a.webp", description: "<p>Soigne.</p>" },
    { name: "Potion de vigilance", img: "b.webp", description: "<p>Éveille.</p>" }
  ];
  const t = (key, data) => `${key}${data ? JSON.stringify(data) : ""}`;

  const doubled = mixtureItemData("doubled", potions, t);

  assert.equal(doubled.name, "SODLTRADE.Lab.Mix.Item.doubled");
  assert.equal(doubled.system.consumabletype, "P");
  assert.equal(doubled.flags["sodl-trade"].mixture.outcome, "doubled");
  assert.ok(doubled.system.description.includes("<p>Soigne.</p>") && doubled.system.description.includes("<p>Éveille.</p>"));
  assert.equal(mixtureItemData("explosion", potions, t), null);
  assert.equal(mixtureItemData("allFade", potions, t), null);
  assert.equal(mixtureItemData("poison", potions, t).system.consumabletype, "V");
});
