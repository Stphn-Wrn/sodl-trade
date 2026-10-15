import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRecipe, unseenRecipeIds } from "../../src/trade/recipe-filter.js";

test("une recette se trouve par son nom, sans tenir compte des accents ni des majuscules", () => {
  const recipe = { name: "Potion anti-toxine", ingredients: ["Racine amère"], station: "cauldron", ready: false };

  const found = matchRecipe(recipe, { text: "ANTI tox", station: "all", readyOnly: false });

  assert.deepEqual(found, { visible: true, via: null });
});

test("une recette se trouve aussi par un de ses ingrédients, qui est alors indiqué", () => {
  const recipe = { name: "Potion anti-toxine", ingredients: ["Racine amère", "Glande à venin"], station: "cauldron", ready: false };

  const found = matchRecipe(recipe, { text: "glande", station: "all", readyOnly: false });

  assert.deepEqual(found, { visible: true, via: "Glande à venin" });
});

test("le filtre d'atelier et « faisables seulement » s'ajoutent à la recherche", () => {
  const recipe = { name: "Torche", ingredients: ["Bois dur"], station: "workbench", ready: false };

  const wrongStation = matchRecipe(recipe, { text: "bois", station: "forge", readyOnly: false });
  const notReady = matchRecipe(recipe, { text: "", station: "all", readyOnly: true });
  const noMatch = matchRecipe(recipe, { text: "venin", station: "all", readyOnly: false });

  assert.deepEqual([wrongStation.visible, notReady.visible, noMatch.visible], [false, false, false]);
});

test("une recette apprise que le joueur n'a pas encore ouverte est nouvelle", () => {
  const known = ["poison", "torche", "corde"];
  const seen = ["poison"];

  assert.deepEqual(unseenRecipeIds(known, seen), ["torche", "corde"]);
});

test("à la toute première visite, rien n'est marqué nouveau : les recettes déjà là ne sont pas des nouveautés", () => {
  assert.deepEqual(unseenRecipeIds(["poison", "torche"], null), []);
});
