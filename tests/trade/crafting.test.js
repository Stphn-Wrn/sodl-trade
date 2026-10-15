import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCraftingAction, emptyCrafting, knownRecipes, recipeStation } from "../../src/trade/crafting.js";

function gm(crafting, action, requireApproval = false) {
  return applyCraftingAction(crafting, action, { isGM: true, ownsActor: () => false, defaultUnit: "ss", requireApproval });
}

function player(crafting, action, requireApproval = false) {
  return applyCraftingAction(crafting, action, { isGM: false, ownsActor: (actorId) => actorId === "a", defaultUnit: "ss", requireApproval });
}

function potionRecipe(overrides) {
  return {
    id: "r1",
    name: "Potion de soins",
    result: { sourceUuid: "Item.potion", name: "Potion de soins", img: "p.webp", quantity: 1 },
    ingredients: [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe", img: "h.webp", quantity: 2 }],
    tools: [],
    cost: null,
    time: "",
    check: { attribute: "", boons: 0 },
    knownBy: ["a"],
    ...overrides
  };
}

test("le MJ crée une recette vide, la renomme puis la supprime", () => {
  let crafting = gm(emptyCrafting(), { type: "addRecipe", id: "r1", name: " Potion " }).crafting;
  assert.deepEqual(crafting.recipes, [{ id: "r1", name: "Potion", result: null, ingredients: [], tools: [], cost: null, time: "", check: { attribute: "", boons: 0 }, knownBy: [] }]);

  crafting = gm(crafting, { type: "renameRecipe", recipeId: "r1", name: "Potion de soins" }).crafting;
  assert.equal(crafting.recipes[0].name, "Potion de soins");

  assert.deepEqual(gm(crafting, { type: "removeRecipe", recipeId: "r1" }).crafting.recipes, []);
});

test("le résultat d'une recette reprend l'objet déposé et sa taille de lot, mais refuse ce qui n'est pas de l'équipement", () => {
  const crafting = { recipes: [potionRecipe({ result: null })], orders: [] };
  const entry = { sourceUuid: "Item.arrows", name: "Flèches", img: "f.webp", type: "ammo", quantity: 20 };

  const next = gm(crafting, { type: "setResult", recipeId: "r1", entry }).crafting;
  assert.deepEqual(next.recipes[0].result, { sourceUuid: "Item.arrows", name: "Flèches", img: "f.webp", quantity: 20 });

  const spell = { sourceUuid: "Item.fire", name: "Boule de feu", img: "b.webp", type: "spell", quantity: 1 };
  assert.throws(() => gm(crafting, { type: "setResult", recipeId: "r1", entry: spell }), { message: "SODLTRADE.Errors.NotCraftable" });
});

test("le MJ change la quantité produite", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  assert.equal(gm(crafting, { type: "setResultQuantity", recipeId: "r1", quantity: "3" }).crafting.recipes[0].result.quantity, 3);
  assert.throws(() => gm(crafting, { type: "setResultQuantity", recipeId: "r1", quantity: "0" }), { message: "SODLTRADE.Errors.InvalidQuantity" });
});

test("un ingrédient ajouté en demande une unité, et un ingrédient déjà présent ou un sort est ignoré", () => {
  const crafting = { recipes: [potionRecipe({ ingredients: [] })], orders: [] };
  const entries = [
    { id: "g1", sourceUuid: "Item.herb", name: "Herbe", img: "h.webp", type: "item", quantity: 10 },
    { id: "g2", sourceUuid: "Item.herb2", name: "herbe", img: "h.webp", type: "item", quantity: 1 },
    { id: "g3", sourceUuid: "Item.fire", name: "Boule de feu", img: "b.webp", type: "spell", quantity: 1 }
  ];

  const next = gm(crafting, { type: "addIngredients", recipeId: "r1", entries }).crafting;

  assert.deepEqual(next.recipes[0].ingredients, [{ id: "g1", sourceUuid: "Item.herb", name: "Herbe", img: "h.webp", quantity: 1 }]);
  assert.throws(() => gm(next, { type: "addIngredients", recipeId: "r1", entries }), { message: "SODLTRADE.Errors.NothingImported" });
});

test("le MJ change la quantité d'un ingrédient ou le retire", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  const more = gm(crafting, { type: "setIngredientQuantity", recipeId: "r1", ingredientId: "g1", quantity: "5" }).crafting;
  assert.equal(more.recipes[0].ingredients[0].quantity, 5);

  assert.throws(() => gm(crafting, { type: "setIngredientQuantity", recipeId: "r1", ingredientId: "g1", quantity: "-1" }), { message: "SODLTRADE.Errors.InvalidQuantity" });
  assert.deepEqual(gm(crafting, { type: "removeIngredient", recipeId: "r1", ingredientId: "g1" }).crafting.recipes[0].ingredients, []);
});

test("le coût d'une recette se lit comme un prix, et un champ vide ou nul la rend gratuite", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  assert.deepEqual(gm(crafting, { type: "setCost", recipeId: "r1", text: "2 CA" }).crafting.recipes[0].cost, { gc: 0, ss: 2, cp: 0, bits: 0 });
  assert.equal(gm(crafting, { type: "setCost", recipeId: "r1", text: "" }).crafting.recipes[0].cost, null);
  assert.equal(gm(crafting, { type: "setCost", recipeId: "r1", text: "0" }).crafting.recipes[0].cost, null);
  assert.throws(() => gm(crafting, { type: "setCost", recipeId: "r1", text: "beaucoup" }), { message: "SODLTRADE.Errors.InvalidPrice" });
});

test("le MJ indique le temps de fabrication et le jet demandé", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  assert.equal(gm(crafting, { type: "setTime", recipeId: "r1", text: " 1 heure " }).crafting.recipes[0].time, "1 heure");

  const checked = gm(crafting, { type: "setCheck", recipeId: "r1", attribute: "intellect", boons: "-1" }).crafting;
  assert.deepEqual(checked.recipes[0].check, { attribute: "intellect", boons: -1 });

  assert.throws(() => gm(crafting, { type: "setCheck", recipeId: "r1", attribute: "charisme", boons: 0 }), { message: "SODLTRADE.Errors.InvalidAttribute" });
});

test("le MJ apprend une recette à un personnage ou la lui retire", () => {
  const crafting = { recipes: [potionRecipe({ knownBy: [] })], orders: [] };

  const taught = gm(crafting, { type: "toggleKnown", recipeId: "r1", actorId: "a" });
  assert.deepEqual([taught.crafting.recipes[0].knownBy, taught.event], [["a"], "learned"]);

  assert.deepEqual(gm(taught.crafting, { type: "toggleKnown", recipeId: "r1", actorId: "a" }).crafting.recipes[0].knownBy, []);
});

test("un personnage ne voit que les recettes qu'il connaît", () => {
  const crafting = { recipes: [potionRecipe({ id: "r1", knownBy: ["a"] }), potionRecipe({ id: "r2", knownBy: ["b"] })], orders: [] };

  assert.deepEqual(knownRecipes(crafting, "a").map((recipe) => recipe.id), ["r1"]);
});

test("les joueurs ne modifient pas les recettes", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  assert.throws(() => player(crafting, { type: "addRecipe", id: "r2", name: "Poison" }), { message: "SODLTRADE.Errors.NotAllowed" });
  assert.throws(() => player(crafting, { type: "toggleKnown", recipeId: "r1", actorId: "a" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("un joueur fabrique une recette connue de son personnage", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  const result = player(crafting, { type: "craft", recipeId: "r1", actorId: "a", orderId: "o1" });

  assert.deepEqual(result.craft, { actorId: "a", recipe: potionRecipe({}) });
  assert.equal(result.order, null);
});

test("on ne fabrique ni pour le personnage d'un autre, ni une recette inconnue, ni une recette sans résultat", () => {
  assert.throws(() => player({ recipes: [potionRecipe({})], orders: [] }, { type: "craft", recipeId: "r1", actorId: "b" }), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => player({ recipes: [potionRecipe({ knownBy: [] })], orders: [] }, { type: "craft", recipeId: "r1", actorId: "a" }), { message: "SODLTRADE.Errors.RecipeUnknown" });
  assert.throws(() => player({ recipes: [potionRecipe({ result: null })], orders: [] }, { type: "craft", recipeId: "r1", actorId: "a" }), { message: "SODLTRADE.Errors.NoResult" });
  assert.throws(() => player({ recipes: [], orders: [] }, { type: "craft", recipeId: "r1", actorId: "a" }), { message: "SODLTRADE.Errors.RecipeGone" });
});

test("quand le MJ doit valider, fabriquer crée une demande sans rien fabriquer", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  const result = player(crafting, { type: "craft", recipeId: "r1", actorId: "a", orderId: "o1" }, true);

  assert.equal(result.craft, null);
  assert.equal(result.event, "ordered");
  assert.deepEqual(result.crafting.orders, [{ id: "o1", actorId: "a", recipeId: "r1", name: "Potion de soins", img: "p.webp" }]);
});

test("le MJ valide une demande avec la recette telle qu'elle est au moment de la validation", () => {
  const crafting = { recipes: [potionRecipe({ time: "1 heure" })], orders: [{ id: "o1", actorId: "a", recipeId: "r1", name: "Potion de soins", img: "p.webp" }] };

  const result = gm(crafting, { type: "approveOrder", orderId: "o1" }, true);

  assert.deepEqual(result.craft, { actorId: "a", recipe: potionRecipe({ time: "1 heure" }) });
  assert.deepEqual([result.crafting.orders, result.event], [[], "approved"]);
});

test("le MJ refuse une demande, ou le joueur l'annule ; un autre joueur ne peut pas y toucher", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [{ id: "o1", actorId: "a", recipeId: "r1", name: "Potion de soins", img: "p.webp" }] };
  const stranger = (current, action) => applyCraftingAction(current, action, { isGM: false, ownsActor: () => false, defaultUnit: "ss", requireApproval: true });

  assert.deepEqual(gm(crafting, { type: "rejectOrder", orderId: "o1" }, true).crafting.orders, []);
  assert.deepEqual(player(crafting, { type: "cancelOrder", orderId: "o1" }, true).event, "cancelled");
  assert.throws(() => stranger(crafting, { type: "cancelOrder", orderId: "o1" }), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => player(crafting, { type: "approveOrder", orderId: "o1" }, true), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("supprimer une recette annule les demandes qui la concernent", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [{ id: "o1", actorId: "a", recipeId: "r1", name: "Potion de soins", img: "p.webp" }] };

  assert.deepEqual(gm(crafting, { type: "removeRecipe", recipeId: "r1" }).crafting.orders, []);
});

test("déposer le résultat fixe le coût des matériaux au quart de son prix, arrondi au supérieur, sans écraser un coût déjà saisi", () => {
  const entry = { sourceUuid: "Item.sword", name: "Épée", img: "s.webp", type: "weapon", quantity: 1, value: "1 co 1 sc" };

  const fresh = gm({ recipes: [potionRecipe({ result: null })], orders: [] }, { type: "setResult", recipeId: "r1", entry }).crafting;
  assert.deepEqual(fresh.recipes[0].cost, { gc: 0, ss: 2, cp: 5, bits: 3 });

  const kept = gm({ recipes: [potionRecipe({ result: null, cost: { gc: 0, ss: 1, cp: 0, bits: 0 } })], orders: [] }, { type: "setResult", recipeId: "r1", entry }).crafting;
  assert.deepEqual(kept.recipes[0].cost, { gc: 0, ss: 1, cp: 0, bits: 0 });

  const unpriced = gm({ recipes: [potionRecipe({ result: null })], orders: [] }, { type: "setResult", recipeId: "r1", entry: { ...entry, value: "" } }).crafting;
  assert.equal(unpriced.recipes[0].cost, null);
});

test("le MJ ajoute un outil requis, sans doublon, puis le retire", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };
  const entries = [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse d'alchimiste", img: "k.webp", type: "item", quantity: 1 }];

  const equipped = gm(crafting, { type: "addTools", recipeId: "r1", entries }).crafting;
  assert.deepEqual(equipped.recipes[0].tools, [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse d'alchimiste", img: "k.webp" }]);

  assert.throws(() => gm(equipped, { type: "addTools", recipeId: "r1", entries }), { message: "SODLTRADE.Errors.NothingImported" });
  assert.deepEqual(gm(equipped, { type: "removeTool", recipeId: "r1", toolId: "t1" }).crafting.recipes[0].tools, []);
});

test("une recette créée avant les outils en accepte un", () => {
  const legacy = potionRecipe({});
  delete legacy.tools;
  const entries = [{ id: "t1", sourceUuid: "Item.kit", name: "Trousse", img: "k.webp", type: "item", quantity: 1 }];

  assert.equal(gm({ recipes: [legacy], orders: [] }, { type: "addTools", recipeId: "r1", entries }).crafting.recipes[0].tools.length, 1);
});

test("le MJ ajoute un prérequis en glissant un métier, une voie, un talent ou une ascendance, mais pas un objet", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };
  const entries = [
    { id: "q1", sourceUuid: "Compendium.prof.Artisan", name: "Artisan", img: "a.webp", type: "profession" },
    { id: "q2", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", type: "weapon" }
  ];

  const next = gm(crafting, { type: "addRequirements", recipeId: "r1", entries }).crafting;

  assert.deepEqual(next.recipes[0].requirements, [{ id: "q1", sourceUuid: "Compendium.prof.Artisan", name: "Artisan", img: "a.webp" }]);
  assert.throws(() => gm(next, { type: "addRequirements", recipeId: "r1", entries }), { message: "SODLTRADE.Errors.NothingImported" });
});

test("le MJ tape un prérequis à la main, puis le retire", () => {
  const crafting = { recipes: [potionRecipe({})], orders: [] };

  const typed = gm(crafting, { type: "addRequirements", recipeId: "r1", entries: [{ id: "q1", sourceUuid: null, name: " forgeron ", img: "", type: "text" }] }).crafting;
  assert.deepEqual(typed.recipes[0].requirements, [{ id: "q1", sourceUuid: null, name: "forgeron", img: "" }]);

  assert.deepEqual(gm(typed, { type: "removeRequirement", recipeId: "r1", requirementId: "q1" }).crafting.recipes[0].requirements, []);
  assert.throws(() => gm(crafting, { type: "addRequirements", recipeId: "r1", entries: [{ id: "q2", sourceUuid: null, name: "  ", img: "", type: "text" }] }), { message: "SODLTRADE.Errors.NothingImported" });
});

test("sans atelier choisi, une recette se fait au chaudron avec une trousse d'alchimiste, à la forge avec du métal, sinon à l'établi", () => {
  const alchemy = potionRecipe({ tools: [{ id: "t", name: "Trousse d’alchimiste" }] });
  const forge = potionRecipe({ result: { name: "Lingot d'argent" }, ingredients: [{ id: "g", name: "Silver ore", quantity: 2 }] });
  const scrap = potionRecipe({ result: { name: "Flèches" }, ingredients: [{ id: "g", name: "Ferraille", quantity: 1 }, { id: "h", name: "Bois dur", quantity: 1 }] });
  const torch = potionRecipe({ result: { name: "Torche" }, ingredients: [{ id: "g", name: "Bois dur", quantity: 1 }] });
  const chosen = potionRecipe({ station: "forge", tools: [{ id: "t", name: "Trousse d'alchimiste" }] });

  const stations = [alchemy, forge, scrap, torch, chosen].map(recipeStation);

  assert.deepEqual(stations, ["cauldron", "forge", "forge", "workbench", "forge"]);
});

test("le MJ choisit l'atelier d'une recette parmi le chaudron, la forge et l'établi", () => {
  const crafting = { recipes: [potionRecipe()], orders: [] };

  const updated = gm(crafting, { type: "setStation", recipeId: "r1", station: "workbench" }).crafting;

  assert.equal(updated.recipes[0].station, "workbench");
  assert.throws(() => gm(crafting, { type: "setStation", recipeId: "r1", station: "moulin" }), { message: "SODLTRADE.Errors.InvalidStation" });
});

test("le MJ apprend toutes les recettes à un personnage d'un coup, ou les lui retire toutes", () => {
  const crafting = { recipes: [potionRecipe({ id: "r1", knownBy: [] }), potionRecipe({ id: "r2", knownBy: ["b"] }), potionRecipe({ id: "r3", knownBy: ["a"] })], orders: [] };

  const taught = gm(crafting, { type: "teachAll", actorId: "a", known: true });
  const forgotten = gm(taught.crafting, { type: "teachAll", actorId: "a", known: false }).crafting;

  assert.deepEqual(taught.crafting.recipes.map((recipe) => recipe.knownBy), [["a"], ["b", "a"], ["a"]]);
  assert.equal(taught.event, "learned");
  assert.deepEqual(forgotten.recipes.map((recipe) => recipe.knownBy), [[], ["b"], []]);
});

test("seul le MJ apprend toutes les recettes", () => {
  const crafting = { recipes: [potionRecipe({ knownBy: [] })], orders: [] };

  assert.throws(() => player(crafting, { type: "teachAll", actorId: "a", known: true }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("une extension fait découvrir des recettes selon sa propre règle ; jamais pour le personnage d'un autre ni avec une règle inconnue", () => {
  const crafting = { orders: [], recipes: [
    { id: "r1", name: "Potion", result: { name: "Potion" }, ingredients: [], knownBy: [] },
    { id: "r2", name: "Huile", result: { name: "Huile" }, ingredients: [], knownBy: ["a"] }
  ] };
  const rules = { cauldron: (recipes, payload) => recipes.filter((recipe) => payload.names.includes(recipe.name)).map((recipe) => recipe.id) };
  const owner = { isGM: false, ownsActor: (actorId) => actorId === "a", discover: (rule) => rules[rule] ?? null };
  const action = { type: "discover", actorId: "a", rule: "cauldron", payload: { names: ["Potion", "Huile"] } };

  const { crafting: next, event } = applyCraftingAction(crafting, action, owner);

  assert.deepEqual(next.recipes.map((recipe) => recipe.knownBy), [["a"], ["a"]]);
  assert.equal(event, "learned");
  assert.throws(() => applyCraftingAction(crafting, { ...action, actorId: "b" }, owner), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => applyCraftingAction(crafting, { ...action, rule: "magic" }, owner), { message: "SODLTRADE.Errors.UnknownAction" });
});

test("un joueur demande au MJ de créer un objet hors recette ; le MJ valide et reçoit la demande à exécuter", () => {
  const request = { type: "lab", data: { action: { type: "mix", actorId: "a", itemIds: ["p1", "p2"] } } };
  const ordered = player(emptyCrafting(), { type: "requestCreation", actorId: "a", orderId: "o1", name: "Potion + Potion", img: "p.webp", request });

  assert.equal(ordered.event, "ordered");
  assert.deepEqual(ordered.crafting.orders, [{ id: "o1", actorId: "a", name: "Potion + Potion", img: "p.webp", request }]);

  const approved = gm(ordered.crafting, { type: "approveOrder", orderId: "o1" });
  assert.equal(approved.event, "approved");
  assert.equal(approved.craft, null);
  assert.deepEqual(approved.order.request, request);
  assert.deepEqual(approved.crafting.orders, []);
});

test("on ne demande pas de création pour le personnage d'un autre", () => {
  const request = { type: "alchemy", data: { action: { type: "brew", actorId: "b", itemIds: [] } } };

  assert.throws(() => player(emptyCrafting(), { type: "requestCreation", actorId: "b", orderId: "o1", name: "Potion", img: "", request }), { message: "SODLTRADE.Errors.NotYourCharacter" });
});
