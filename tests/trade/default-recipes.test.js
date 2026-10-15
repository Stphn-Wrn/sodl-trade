import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planRecipeImport, refKey } from "../../src/trade/default-recipes.js";
import { applyCraftingAction } from "../../src/trade/crafting.js";

function found(ref, overrides) {
  return [refKey(ref), { uuid: `Item.${refKey(ref)}`, name: refKey(ref), img: "i.webp", type: "item", value: "0", quantity: 1, ...overrides }];
}

test("une recette par défaut se construit avec les objets trouvés, dans la langue de Foundry", () => {
  const definitions = [{
    key: "iron-ingot",
    name: { fr: "Lingot de fer", en: "Iron ingot" },
    station: "forge",
    result: { resource: "iron-ingot" },
    quantity: 1,
    ingredients: [{ ref: { resource: "iron-ore" }, quantity: 2 }],
    tools: [{ names: ["Tool kit", "Trousse à outils"] }],
    cost: null,
    time: { fr: "1 heure", en: "1 hour" },
    check: { attribute: "", boons: 0 }
  }];
  const resolved = new Map([
    found({ resource: "iron-ingot" }, { uuid: "Item.ingot", name: "Lingot de fer", img: "l.webp" }),
    found({ resource: "iron-ore" }, { uuid: "Item.ore", name: "Minerai de fer", img: "m.webp" }),
    found({ names: ["Tool kit", "Trousse à outils"] }, { uuid: "Compendium.kit", name: "Trousse à outils", img: "k.webp" })
  ]);

  const { recipes, skipped } = planRecipeImport(definitions, "fr", resolved, []);

  assert.deepEqual(skipped, []);
  assert.deepEqual(recipes, [{
    id: "default-iron-ingot",
    key: "iron-ingot",
    name: "Lingot de fer",
    station: "forge",
    result: { sourceUuid: "Item.ingot", name: "Lingot de fer", img: "l.webp", quantity: 1 },
    ingredients: [{ id: "default-iron-ingot-0", sourceUuid: "Item.ore", name: "Minerai de fer", img: "m.webp", quantity: 2 }],
    tools: [{ id: "default-iron-ingot-tool-0", sourceUuid: "Compendium.kit", name: "Trousse à outils", img: "k.webp" }],
    requirements: [],
    cost: null,
    time: "1 heure",
    check: { attribute: "", boons: 0 },
    knownBy: []
  }]);
});

test("les prérequis d'une recette livrée prennent le nom de la langue de Foundry et gardent les autres pour reconnaître les fiches", () => {
  const definitions = [{
    key: "healing-potion",
    name: { fr: "Potion de soins", en: "Healing potion" },
    result: { names: ["Healing Potion"] },
    quantity: 1,
    ingredients: [],
    tools: [],
    requirements: [{ name: { fr: "Apothicaire ou guérisseur", en: "Apothecary or healer" }, aliases: ["Alchemist"] }],
    cost: null,
    time: { fr: "", en: "" },
    check: { attribute: "", boons: 0 }
  }];
  const resolved = new Map([found({ names: ["Healing Potion"] }, {})]);

  const [recipe] = planRecipeImport(definitions, "fr", resolved, []).recipes;

  assert.deepEqual(recipe.requirements, [{ id: "default-healing-potion-req-0", sourceUuid: null, name: "Apothicaire ou guérisseur", img: "", aliases: ["Apothicaire ou guérisseur", "Apothecary or healer", "Alchemist"] }]);
});

test("un coût « auto » suit le Compagnon : un quart du prix de l'objet (en ss, comme le système), moins la valeur des ingrédients fournis", () => {
  const definitions = [{
    key: "healing-potion",
    name: { fr: "Potion de soins", en: "Healing potion" },
    result: { names: ["Healing Potion", "Potion de soins"] },
    quantity: 1,
    ingredients: [{ ref: { resource: "healing-herbs" }, quantity: 3 }, { ref: { resource: "empty-vial" }, quantity: 1 }],
    tools: [],
    cost: "auto",
    time: { fr: "", en: "" },
    check: { attribute: "intellect", boons: 0 }
  }];
  const resolved = new Map([
    found({ names: ["Healing Potion", "Potion de soins"] }, { value: "2" }),
    found({ resource: "healing-herbs" }, { value: "0.01" }),
    found({ resource: "empty-vial" }, { value: "0.01" })
  ]);

  const [recipe] = planRecipeImport(definitions, "fr", resolved, []).recipes;

  assert.deepEqual(recipe.cost, { gc: 0, ss: 0, cp: 4, bits: 6 });
});

test("un coût écrit dans la définition est repris tel quel, et la quantité produite suit le lot de l'objet si elle n'est pas donnée", () => {
  const definitions = [{
    key: "arrows",
    name: { fr: "Flèches", en: "Arrows" },
    result: { names: ["Arrows", "Flèches"] },
    ingredients: [],
    tools: [],
    cost: "1 sc",
    time: { fr: "", en: "" },
    check: { attribute: "", boons: 0 }
  }];
  const resolved = new Map([found({ names: ["Arrows", "Flèches"] }, { type: "ammo", quantity: 5 })]);

  const [recipe] = planRecipeImport(definitions, "fr", resolved, []).recipes;

  assert.deepEqual([recipe.cost, recipe.result.quantity], [{ gc: 0, ss: 0, cp: 1, bits: 0 }, 5]);
});

test("une recette dont un objet est introuvable est écartée, et une recette déjà présente n'est pas recréée", () => {
  const definitions = [
    { key: "poison", name: { fr: "Poison", en: "Poison" }, result: { names: ["Poison"] }, quantity: 1, ingredients: [], tools: [], cost: null, time: { fr: "", en: "" }, check: { attribute: "", boons: 0 } },
    { key: "torch", name: { fr: "Torche", en: "Torch" }, result: { names: ["Torch"] }, quantity: 1, ingredients: [], tools: [], cost: null, time: { fr: "", en: "" }, check: { attribute: "", boons: 0 } },
    { key: "candle", name: { fr: "Bougie", en: "Candle" }, result: { names: ["Candle"] }, quantity: 1, ingredients: [], tools: [], cost: null, time: { fr: "", en: "" }, check: { attribute: "", boons: 0 } }
  ];
  const resolved = new Map([found({ names: ["Torch"] }, {}), found({ names: ["Candle"] }, {})]);

  const { recipes, skipped } = planRecipeImport(definitions, "fr", resolved, ["candle"]);

  assert.deepEqual(recipes.map((recipe) => recipe.key), ["torch"]);
  assert.deepEqual(skipped, ["Poison"]);
});

test("le MJ ajoute les recettes par défaut, sans doublon, et les joueurs ne le peuvent pas", () => {
  const recipe = { id: "default-torch", key: "torch", name: "Torche", result: null, ingredients: [], tools: [], cost: null, time: "", check: { attribute: "", boons: 0 }, knownBy: [] };
  const crafting = { recipes: [], orders: [] };
  const gm = (state, action) => applyCraftingAction(state, action, { isGM: true, ownsActor: () => false });

  const added = gm(crafting, { type: "addRecipes", recipes: [recipe] }).crafting;
  assert.deepEqual(added.recipes.map((entry) => entry.key), ["torch"]);

  assert.throws(() => gm(added, { type: "addRecipes", recipes: [recipe] }), { message: "SODLTRADE.Errors.NothingImported" });
  assert.throws(() => applyCraftingAction(crafting, { type: "addRecipes", recipes: [recipe] }, { isGM: false, ownsActor: () => true }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("chaque recette livrée a un nom et un temps dans les deux langues, et ne vise que des ressources du catalogue", () => {
  const { recipes } = JSON.parse(readFileSync(new URL("../../data/recipes.json", import.meta.url), "utf8"));
  const catalog = JSON.parse(readFileSync(new URL("../../data/resources.json", import.meta.url), "utf8"));
  const resourceKeys = catalog.folders.flatMap((folder) => folder.items.map((item) => item.key));
  const refs = recipes.flatMap((recipe) => [recipe.result, ...recipe.ingredients.map((ingredient) => ingredient.ref), ...recipe.tools]);

  assert.equal(new Set(recipes.map((recipe) => recipe.key)).size, recipes.length);
  for (const recipe of recipes) {
    assert.ok(recipe.name.fr && recipe.name.en && recipe.time.fr && recipe.time.en, recipe.key);
  }
  for (const ref of refs.filter((entry) => entry.resource)) {
    assert.ok(resourceKeys.includes(ref.resource), ref.resource);
  }
});

test("les recettes livrées suivent le Compagnon : aucun jet, et un métier, une voie ou un talent pour tout ce qui n'est pas un objet simple", () => {
  const { recipes } = JSON.parse(readFileSync(new URL("../../data/recipes.json", import.meta.url), "utf8"));

  for (const recipe of recipes) {
    assert.equal(recipe.check.attribute, "", recipe.key);
    if (!recipe.simple) {
      assert.ok((recipe.requirements ?? []).length > 0, recipe.key);
    }
  }
});

test("le poison de l'assassin suit le talent Fabrication de poison : 5 cp d'ingrédients spéciaux, une minute, une trousse d'alchimiste", () => {
  const { recipes } = JSON.parse(readFileSync(new URL("../../data/recipes.json", import.meta.url), "utf8"));
  const poison = recipes.find((recipe) => recipe.key === "poison");

  assert.deepEqual([poison.cost, poison.time.en, poison.ingredients], ["5 cp", "1 minute", []]);
  assert.ok(poison.tools[0].names.includes("Alchemist's kit"));
  assert.ok(poison.requirements.some((requirement) => requirement.name.en === "Manufacture Poison"));
});
