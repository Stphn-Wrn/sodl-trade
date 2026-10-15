import { LocalizedError } from "../shared/i18n.js";
import { payWithChange } from "./wealth.js";

// Target number of every challenge roll in Shadow of the Demon Lord.
const CHALLENGE_TARGET = 10;

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// An ingredient is found by name, or by the item it was copied from when the character renamed it.
export function matchesIngredient(item, ingredient) {
  if (ingredient.sourceUuid && (item.sourceUuids ?? []).includes(ingredient.sourceUuid)) {
    return true;
  }
  return normalizeName(item.name) === normalizeName(ingredient.name);
}

export function isSameIngredient(first, second) {
  if (first.sourceUuid && first.sourceUuid === second.sourceUuid) {
    return true;
  }
  return normalizeName(first.name) === normalizeName(second.name);
}

function stacksOf(ingredient, inventory) {
  return inventory.items.filter((item) => matchesIngredient(item, ingredient));
}

export function ingredientStatus(recipe, inventory) {
  return recipe.ingredients.map((ingredient) => {
    const owned = stacksOf(ingredient, inventory).reduce((total, item) => total + item.quantity, 0);
    return { ...ingredient, owned, missing: Math.max(0, ingredient.quantity - owned) };
  });
}

// Tools, such as an alchemist's kit, must be owned but are not used up.
export function toolStatus(recipe, inventory) {
  return (recipe.tools ?? []).map((tool) => ({ ...tool, owned: stacksOf(tool, inventory).length > 0 }));
}

// A requirement is met by a profession, path, talent or ancestry copied from the dropped one,
// or whose name contains the requirement, so "Forgeron" matches a profession named "Artisan (forgeron)".
// Shipped recipes also list the other names of the requirement, such as the English one of an untranslated book.
function hasTrait(requirement, traits) {
  const wanted = [requirement.name, ...(requirement.aliases ?? [])].map(normalizeName).filter((name) => name !== "");
  return traits.some((trait) => {
    if (requirement.sourceUuid && (trait.sourceUuids ?? []).includes(requirement.sourceUuid)) {
      return true;
    }
    return wanted.some((name) => normalizeName(trait.name).includes(name));
  });
}

// Any one of the requirements is enough; a recipe without requirements is open to everyone.
export function requirementStatus(recipe, inventory) {
  const requirements = (recipe.requirements ?? []).map((requirement) => ({ ...requirement, owned: hasTrait(requirement, inventory.traits ?? []) }));
  return { met: requirements.length === 0 || requirements.some((requirement) => requirement.owned), requirements };
}

function consume(ingredient, inventory, plan) {
  let needed = ingredient.quantity;
  for (const item of stacksOf(ingredient, inventory)) {
    if (needed === 0) {
      break;
    }
    const taken = Math.min(needed, item.quantity);
    needed -= taken;
    if (taken === item.quantity) {
      plan.deleteItemIds.push(item.id);
    } else {
      plan.updateItems.push({ _id: item.id, "system.quantity": item.quantity - taken });
    }
  }
}

// What the character loses when crafting, whether the roll succeeds or not.
// "wealth" is the purse left after paying, or null when the recipe costs nothing.
export function planCraft(recipe, inventory) {
  const requirements = requirementStatus(recipe, inventory);
  if (!requirements.met) {
    throw new LocalizedError("SODLTRADE.Errors.MissingRequirement", { names: requirements.requirements.map((requirement) => requirement.name).join(", ") });
  }
  const missing = ingredientStatus(recipe, inventory).find((ingredient) => ingredient.missing > 0);
  if (missing) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: missing.name });
  }
  const missingTool = toolStatus(recipe, inventory).find((tool) => !tool.owned);
  if (missingTool) {
    throw new LocalizedError("SODLTRADE.Errors.MissingTool", { name: missingTool.name });
  }
  let wealth = null;
  if (recipe.cost) {
    wealth = payWithChange(inventory.wealth, recipe.cost);
    if (!wealth) {
      throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
    }
  }
  const plan = { deleteItemIds: [], updateItems: [], wealth };
  for (const ingredient of recipe.ingredients) {
    consume(ingredient, inventory, plan);
  }
  return plan;
}

const CHECKS = {
  none: () => ({ rolls: false, succeeded: () => true }),
  challenge: (check) => ({
    rolls: true,
    attribute: check.attribute,
    boons: check.boons,
    succeeded: (total) => total >= CHALLENGE_TARGET
  })
};

export function resolveCheck(check) {
  if (!check?.attribute) {
    return CHECKS.none();
  }
  return CHECKS.challenge(check);
}
