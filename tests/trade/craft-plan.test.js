import { test } from "node:test";
import assert from "node:assert/strict";
import { ingredientStatus, planCraft, requirementStatus, resolveCheck, toolStatus } from "../../src/trade/craft-plan.js";

function wealth(overrides) {
  return { gc: 0, ss: 0, cp: 0, bits: 0, ...overrides };
}

test("un ingrédient est reconnu par son nom, sans tenir compte des majuscules ni des accents, et compte toutes les piles", () => {
  const recipe = { ingredients: [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe de Lune", img: "h.webp", quantity: 3 }] };
  const inventory = { wealth: wealth({}), items: [
    { id: "a", name: "herbe de lune", sourceUuids: [], quantity: 1 },
    { id: "b", name: "Hérbe de Lune ", sourceUuids: [], quantity: 1 },
    { id: "c", name: "Corde", sourceUuids: [], quantity: 5 }
  ] };

  const status = ingredientStatus(recipe, inventory);

  assert.deepEqual(status, [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe de Lune", img: "h.webp", quantity: 3, owned: 2, missing: 1 }]);
});

test("un ingrédient renommé dans l'inventaire est reconnu par son objet d'origine", () => {
  const recipe = { ingredients: [{ id: "g1", sourceUuid: "Compendium.x.Item.herb", name: "Herbe de Lune", img: "h.webp", quantity: 1 }] };
  const inventory = { wealth: wealth({}), items: [{ id: "a", name: "Herbe cueillie à minuit", sourceUuids: ["Compendium.x.Item.herb"], quantity: 1 }] };

  assert.equal(ingredientStatus(recipe, inventory)[0].missing, 0);
});

test("fabriquer consomme les ingrédients pile par pile et retire les piles vidées", () => {
  const recipe = { ingredients: [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe", img: "h.webp", quantity: 4 }], cost: null };
  const inventory = { wealth: wealth({ ss: 2 }), items: [
    { id: "a", name: "Herbe", sourceUuids: [], quantity: 2 },
    { id: "b", name: "Herbe", sourceUuids: [], quantity: 3 }
  ] };

  const plan = planCraft(recipe, inventory);

  assert.deepEqual(plan, { deleteItemIds: ["a"], updateItems: [{ _id: "b", "system.quantity": 1 }], wealth: null });
});

test("il est impossible de fabriquer s'il manque un ingrédient", () => {
  const recipe = { ingredients: [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe", img: "h.webp", quantity: 2 }], cost: null };
  const inventory = { wealth: wealth({}), items: [{ id: "a", name: "Herbe", sourceUuids: [], quantity: 1 }] };

  assert.throws(() => planCraft(recipe, inventory), { message: "SODLTRADE.Errors.NotEnoughItems" });
});

test("le coût d'une recette est payé en rendant la monnaie, et bloque la fabrication si l'argent manque", () => {
  const recipe = { ingredients: [], cost: wealth({ ss: 3 }) };

  const paid = planCraft(recipe, { wealth: wealth({ gc: 1 }), items: [] });
  assert.deepEqual(paid.wealth, wealth({ ss: 7 }));

  assert.throws(() => planCraft(recipe, { wealth: wealth({ ss: 2 }), items: [] }), { message: "SODLTRADE.Errors.NotEnoughWealth" });
});

test("une recette sans jet réussit toujours", () => {
  const check = resolveCheck({ attribute: "", boons: 0 });

  assert.equal(check.rolls, false);
  assert.equal(check.succeeded(null), true);
});

test("une recette avec jet d'attribut réussit à 10 ou plus", () => {
  const check = resolveCheck({ attribute: "intellect", boons: 1 });

  assert.deepEqual([check.rolls, check.attribute, check.boons], [true, "intellect", 1]);
  assert.equal(check.succeeded(10), true);
  assert.equal(check.succeeded(9), false);
});

test("un outil requis doit être possédé mais n'est pas consommé", () => {
  const recipe = { ingredients: [], tools: [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse d'alchimiste", img: "k.webp" }], cost: null };
  const inventory = { wealth: wealth({}), items: [{ id: "k", name: "Trousse d'alchimiste", sourceUuids: [], quantity: 1 }] };

  assert.deepEqual(planCraft(recipe, inventory), { deleteItemIds: [], updateItems: [], wealth: null });
  assert.deepEqual(toolStatus(recipe, inventory), [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse d'alchimiste", img: "k.webp", owned: true }]);
});

test("il est impossible de fabriquer sans l'outil requis", () => {
  const recipe = { ingredients: [], tools: [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse d'alchimiste", img: "k.webp" }], cost: null };
  const inventory = { wealth: wealth({}), items: [] };

  assert.throws(() => planCraft(recipe, inventory), { message: "SODLTRADE.Errors.MissingTool" });
});

test("un prérequis est rempli par un métier, une voie, un talent ou une ascendance dont le nom le contient, sans tenir compte des accents", () => {
  const recipe = { ingredients: [], tools: [], requirements: [{ id: "q1", sourceUuid: null, name: "Forgeron", img: "" }], cost: null };
  const inventory = { wealth: wealth({}), items: [], traits: [{ name: "Artisan (forgéron)", sourceUuids: [] }] };

  assert.deepEqual(requirementStatus(recipe, inventory), { met: true, requirements: [{ id: "q1", sourceUuid: null, name: "Forgeron", img: "", owned: true }] });
});

test("un prérequis des recettes livrées est aussi reconnu sous ses autres noms, comme la version anglaise d'une fiche", () => {
  const recipe = { ingredients: [], tools: [], requirements: [{ id: "q1", sourceUuid: null, name: "Apothicaire ou guérisseur", img: "", aliases: ["Apothecary", "Alchemist"] }], cost: null };
  const english = { wealth: wealth({}), items: [], traits: [{ name: "Alchemist", sourceUuids: [] }] };
  const unrelated = { wealth: wealth({}), items: [], traits: [{ name: "Soldat", sourceUuids: [] }] };

  assert.equal(requirementStatus(recipe, english).met, true);
  assert.equal(requirementStatus(recipe, unrelated).met, false);
});

test("un prérequis glissé depuis un compendium est aussi reconnu par l'objet dont la fiche est une copie", () => {
  const recipe = { ingredients: [], tools: [], requirements: [{ id: "q1", sourceUuid: "Compendium.prof.Artisan", name: "Artisan", img: "" }], cost: null };
  const inventory = { wealth: wealth({}), items: [], traits: [{ name: "Forgeron", sourceUuids: ["Compendium.prof.Artisan"] }] };

  assert.equal(requirementStatus(recipe, inventory).met, true);
});

test("un seul des prérequis suffit, et une recette sans prérequis est ouverte à tous", () => {
  const either = { ingredients: [], tools: [], requirements: [{ id: "q1", name: "Forgeron" }, { id: "q2", name: "Armurier" }], cost: null };
  const inventory = { wealth: wealth({}), items: [], traits: [{ name: "Armurier", sourceUuids: [] }] };

  assert.equal(requirementStatus(either, inventory).met, true);
  assert.equal(requirementStatus({ ingredients: [], cost: null }, { wealth: wealth({}), items: [] }).met, true);
});

test("il est impossible de fabriquer sans remplir un prérequis", () => {
  const recipe = { ingredients: [], tools: [], requirements: [{ id: "q1", name: "Forgeron" }, { id: "q2", name: "Armurier" }], cost: null };
  const inventory = { wealth: wealth({}), items: [], traits: [{ name: "Cuisinier", sourceUuids: [] }] };

  assert.throws(() => planCraft(recipe, inventory), (err) => err.message === "SODLTRADE.Errors.MissingRequirement" && err.data.names === "Forgeron, Armurier");
});
