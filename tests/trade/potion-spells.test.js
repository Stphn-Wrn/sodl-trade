import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRecipeReference, learnPotionRecipe, planSpellBrew, recipeFromPotion } from "../../src/trade/potion-spells.js";

test("identifier une potion apprend la recette qui la fabrique déjà, reconnue par l'objet d'origine ou par le nom", () => {
  const crafting = { orders: [], recipes: [
    { id: "r1", name: "Potion de soins", result: { sourceUuid: "Compendium.potions.soins", name: "Potion de soins", img: "p.webp", quantity: 1 }, knownBy: ["b"] },
    { id: "r2", name: "Corde", result: { sourceUuid: "Item.rope", name: "Corde", img: "c.webp", quantity: 1 }, knownBy: [] }
  ] };
  const potion = { name: "Potion de soins (fiole fêlée)", sourceUuids: ["Compendium.potions.soins"] };

  const { crafting: next, recipe, created } = learnPotionRecipe(crafting, { actorId: "a", potion, fallback: null });

  assert.deepEqual([recipe.id, created], ["r1", false]);
  assert.deepEqual(next.recipes.map((entry) => entry.knownBy), [["b", "a"], []]);
});

test("une potion sans recette en crée une, connue de celui qui l'a identifiée ; sans objet d'origine, le MJ doit la créer", () => {
  const crafting = { orders: [], recipes: [] };
  const potion = { name: "Potion d'ailes", sourceUuids: [] };
  const fallback = { id: "new", name: "Potion d'ailes", result: { sourceUuid: "Compendium.x", name: "Potion d'ailes", img: "w.webp", quantity: 1 }, knownBy: [] };

  const { crafting: next, created } = learnPotionRecipe(crafting, { actorId: "a", potion, fallback });

  assert.equal(created, true);
  assert.deepEqual(next.recipes, [{ ...fallback, knownBy: ["a"] }]);
  assert.throws(() => learnPotionRecipe(crafting, { actorId: "a", potion, fallback: null }), (err) => err.message === "SODLTRADE.Errors.NoPotionRecipe" && err.data.name === "Potion d'ailes");
});

test("la recette créée par l'identification suit la règle du Compagnon : au chaudron, un quart du prix en matériaux, sans jet", () => {
  const potion = { name: "Potion d'ailes", img: "w.webp", value: "30", sourceUuid: "Compendium.potions.ailes" };
  const kit = { id: "k", sourceUuid: "Compendium.kit", name: "Trousse d’alchimiste", img: "k.webp" };
  const requirements = [{ id: "q", sourceUuid: null, name: "Alchimiste", img: "" }];

  const recipe = recipeFromPotion({ id: "r9", potion, kit, requirements, time: "Entre deux aventures", defaultUnit: "ss" });

  assert.deepEqual(recipe, {
    id: "r9",
    name: "Potion d'ailes",
    station: "cauldron",
    result: { sourceUuid: "Compendium.potions.ailes", name: "Potion d'ailes", img: "w.webp", quantity: 1 },
    ingredients: [],
    tools: [kit],
    requirements,
    cost: { gc: 0, ss: 7, cp: 5, bits: 0 },
    time: "Entre deux aventures",
    check: { attribute: "", boons: 0 },
    knownBy: []
  });
});

test("le sort Brew Potion ne demande que la trousse d'alchimiste et un récipient : ni ingrédients, ni argent, ni métier", () => {
  const recipe = {
    name: "Potion de soins",
    ingredients: [{ id: "g", name: "Herbes médicinales", quantity: 3 }],
    tools: [{ id: "t", name: "Trousse d’alchimiste" }],
    requirements: [{ id: "q", name: "Apothicaire" }],
    cost: { gc: 0, ss: 5, cp: 0, bits: 0 }
  };
  const inventory = { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, traits: [], items: [
    { id: "k", name: "Trousse d’alchimiste", sourceUuids: [], quantity: 1 },
    { id: "v", name: "Fiole vide", resourceKey: "empty-vial", sourceUuids: [], quantity: 2 }
  ] };

  assert.deepEqual(planSpellBrew(recipe, inventory), { deleteItemIds: [], updateItems: [{ _id: "v", "system.quantity": 1 }], wealth: null });
});

test("sans récipient vide, ou sans trousse d'alchimiste, le sort ne remplit rien ; une flasque du livre fait aussi l'affaire", () => {
  const recipe = { name: "Potion de soins", ingredients: [], tools: [{ id: "t", name: "Trousse d’alchimiste" }], cost: null };
  const noVial = { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [{ id: "k", name: "Trousse d’alchimiste", sourceUuids: [], quantity: 1 }] };
  const noKit = { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [{ id: "f", name: "Flasque", sourceUuids: [], quantity: 1 }] };
  const flask = { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [...noVial.items, ...noKit.items] };

  assert.throws(() => planSpellBrew(recipe, noVial), { message: "SODLTRADE.Errors.NoContainer" });
  assert.throws(() => planSpellBrew(recipe, noKit), { message: "SODLTRADE.Errors.MissingTool" });
  assert.deepEqual(planSpellBrew(recipe, flask).deleteItemIds, ["f"]);
});

test("le talent Recipe Reference du Brewmaster est reconnu sur la fiche, en anglais comme en français", () => {
  const brewmaster = { traits: [{ name: "Brewmaster", sourceUuids: [] }, { name: "recipe reference", sourceUuids: [] }] };
  const apothecary = { traits: [{ name: "Apothicaire ou guérisseur", sourceUuids: [] }] };

  assert.equal(hasRecipeReference(brewmaster), true);
  assert.equal(hasRecipeReference(apothecary), false);
});
