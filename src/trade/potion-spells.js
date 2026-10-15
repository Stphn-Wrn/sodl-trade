import { LocalizedError } from "../shared/i18n.js";
import { isSameIngredient, matchesIngredient, toolStatus } from "./craft-plan.js";
import { RECIPE_REFERENCE_NAMES } from "./book-requirements.js";
import { materialsCost } from "./crafting.js";

// Brew Potion fills a container: the module's empty vial, or the book's flask.
const CONTAINER_KEY = "empty-vial";
const CONTAINER_NAMES = ["Empty vial", "Fiole vide", "Flask", "Flasque"];

function producesPotion(recipe, potion) {
  if (!recipe.result) {
    return false;
  }
  if (recipe.result.sourceUuid && (potion.sourceUuids ?? []).includes(recipe.result.sourceUuid)) {
    return true;
  }
  return isSameIngredient(recipe.result, potion);
}

// Identify Substance: "If the target is a potion, you also learn the recipe to make it."
// The recipe that already makes the potion is learned; otherwise the one built from the potion is added.
export function learnPotionRecipe(crafting, { actorId, potion, fallback }) {
  const existing = crafting.recipes.find((recipe) => producesPotion(recipe, potion));
  if (existing) {
    const recipes = crafting.recipes.map((recipe) => {
      if (recipe.id === existing.id && !recipe.knownBy.includes(actorId)) {
        return { ...recipe, knownBy: [...recipe.knownBy, actorId] };
      }
      return recipe;
    });
    return { crafting: { ...crafting, recipes }, recipe: existing, created: false };
  }
  if (!fallback) {
    throw new LocalizedError("SODLTRADE.Errors.NoPotionRecipe", { name: potion.name });
  }
  const recipe = { ...fallback, knownBy: [actorId] };
  return { crafting: { ...crafting, recipes: [...crafting.recipes, recipe] }, recipe, created: true };
}

// A potion's recipe made by the Companion's crafting rule: materials worth a quarter of its price, no roll.
export function recipeFromPotion({ id, potion, kit, requirements, time, defaultUnit }) {
  const tools = [];
  if (kit) {
    tools.push(kit);
  }
  return {
    id,
    name: potion.name,
    station: "cauldron",
    result: { sourceUuid: potion.sourceUuid, name: potion.name, img: potion.img, quantity: 1 },
    ingredients: [],
    tools,
    requirements,
    cost: materialsCost(potion, defaultUnit),
    time,
    check: { attribute: "", boons: 0 },
    knownBy: []
  };
}

function isContainer(item) {
  if (item.resourceKey === CONTAINER_KEY) {
    return true;
  }
  return CONTAINER_NAMES.some((name) => matchesIngredient(item, { name }));
}

// Brew Potion (Alchemy 1): an hour with the alchemist's kit fills a container with one dose.
// The spell replaces the ingredients, the money and the profession of ordinary crafting.
export function planSpellBrew(recipe, inventory) {
  const missingTool = toolStatus(recipe, inventory).find((tool) => !tool.owned);
  if (missingTool) {
    throw new LocalizedError("SODLTRADE.Errors.MissingTool", { name: missingTool.name });
  }
  const container = inventory.items.find(isContainer);
  if (!container) {
    throw new LocalizedError("SODLTRADE.Errors.NoContainer");
  }
  if (container.quantity > 1) {
    return { deleteItemIds: [], updateItems: [{ _id: container.id, "system.quantity": container.quantity - 1 }], wealth: null };
  }
  return { deleteItemIds: [container.id], updateItems: [], wealth: null };
}

// Occult Philosophy, Brewmaster: Recipe Reference halves the time to brew a potion.
// Its other half, materials worth a third of the price, costs more than the Companion's quarter, so it is not applied.
export function hasRecipeReference(inventory) {
  return (inventory.traits ?? []).some((trait) => RECIPE_REFERENCE_NAMES.some((name) => matchesIngredient(trait, { name })));
}
