import { LocalizedError } from "../shared/i18n.js";
import { isSameIngredient } from "./craft-plan.js";
import { TRADABLE_TYPES, sourceQuantity } from "./inventory.js";
import { parsePrice } from "./price.js";
import { fromBits, isEmptyWealth, toBits } from "./wealth.js";

// What a character is, rather than what they carry, can be required to craft.
export const REQUIREMENT_TYPES = ["profession", "path", "talent", "ancestry"];
const TYPED_REQUIREMENT = "text";

// Attributes a recipe can ask to roll; an empty one means no roll.
export const CRAFT_ATTRIBUTES = ["", "strength", "agility", "intellect", "will"];

export function emptyCrafting() {
  return { recipes: [], orders: [] };
}

export function knownRecipes(crafting, actorId) {
  return crafting.recipes.filter((recipe) => recipe.knownBy.includes(actorId));
}

function result(crafting, craft = null, event = null, order = null) {
  return { crafting, craft, event, order };
}

function findRecipe(crafting, recipeId) {
  const recipe = crafting.recipes.find((entry) => entry.id === recipeId);
  if (!recipe) {
    throw new LocalizedError("SODLTRADE.Errors.RecipeGone");
  }
  return recipe;
}

function updateRecipe(crafting, recipeId, change) {
  findRecipe(crafting, recipeId);
  return { ...crafting, recipes: crafting.recipes.map((recipe) => {
    if (recipe.id === recipeId) {
      return change(recipe);
    }
    return recipe;
  }) };
}

function updateIngredient(crafting, recipeId, ingredientId, change) {
  return updateRecipe(crafting, recipeId, (recipe) => {
    if (!recipe.ingredients.some((ingredient) => ingredient.id === ingredientId)) {
      throw new LocalizedError("SODLTRADE.Errors.IngredientGone");
    }
    return { ...recipe, ingredients: recipe.ingredients.map((ingredient) => {
      if (ingredient.id === ingredientId) {
        return change(ingredient);
      }
      return ingredient;
    }) };
  });
}

function toCount(value) {
  const count = Math.trunc(Number(value));
  if (!Number.isFinite(count) || count < 1) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  return count;
}

function toBoons(value) {
  const boons = Math.trunc(Number(value));
  if (!Number.isFinite(boons)) {
    return 0;
  }
  return boons;
}

function cleanText(text) {
  return String(text ?? "").trim();
}

function addRecipe(crafting, { id, name }) {
  const recipe = { id, name: cleanText(name), result: null, ingredients: [], tools: [], cost: null, time: "", check: { attribute: "", boons: 0 }, knownBy: [] };
  return result({ ...crafting, recipes: [...crafting.recipes, recipe] });
}

// Default recipes come ready-made from the GM's client, which looked up their items.
function addRecipes(crafting, { recipes }) {
  const keys = crafting.recipes.map((recipe) => recipe.key).filter(Boolean);
  const added = recipes.filter((recipe) => !keys.includes(recipe.key));
  if (added.length === 0) {
    throw new LocalizedError("SODLTRADE.Errors.NothingImported");
  }
  return result({ ...crafting, recipes: [...crafting.recipes, ...added] });
}

function renameRecipe(crafting, { recipeId, name }) {
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, name: cleanText(name) })));
}

// Pending requests for a deleted recipe could never be approved, so they go with it.
function removeRecipe(crafting, { recipeId }) {
  findRecipe(crafting, recipeId);
  return result({
    recipes: crafting.recipes.filter((recipe) => recipe.id !== recipeId),
    orders: (crafting.orders ?? []).filter((order) => order.recipeId !== recipeId)
  });
}

// Demon Lord's Companion: the materials are worth a quarter of the item's price.
function materialsCost(entry, defaultUnit) {
  const price = parsePrice(entry.value, defaultUnit);
  if (!price || isEmptyWealth(price)) {
    return null;
  }
  return fromBits(Math.ceil(toBits(price) / 4));
}

function setResult(crafting, { recipeId, entry }, { defaultUnit }) {
  if (!TRADABLE_TYPES.includes(entry.type)) {
    throw new LocalizedError("SODLTRADE.Errors.NotCraftable", { name: entry.name });
  }
  const crafted = { sourceUuid: entry.sourceUuid, name: entry.name, img: entry.img, quantity: sourceQuantity({ system: { quantity: entry.quantity } }) };
  return result(updateRecipe(crafting, recipeId, (recipe) => {
    let name = recipe.name;
    if (name === "") {
      name = entry.name;
    }
    let cost = recipe.cost;
    if (!cost) {
      cost = materialsCost(entry, defaultUnit);
    }
    return { ...recipe, name, result: crafted, cost };
  }));
}

function setResultQuantity(crafting, { recipeId, quantity }) {
  const count = toCount(quantity);
  return result(updateRecipe(crafting, recipeId, (recipe) => {
    if (!recipe.result) {
      throw new LocalizedError("SODLTRADE.Errors.NoResult", { name: recipe.name });
    }
    return { ...recipe, result: { ...recipe.result, quantity: count } };
  }));
}

// A dropped stack of 20 arrows still asks for one arrow: the GM sets how many are needed.
function addIngredients(crafting, { recipeId, entries }) {
  const recipe = findRecipe(crafting, recipeId);
  const added = [];
  for (const entry of entries) {
    const ingredient = { id: entry.id, sourceUuid: entry.sourceUuid, name: entry.name, img: entry.img, quantity: 1 };
    const known = [...recipe.ingredients, ...added].some((existing) => isSameIngredient(existing, ingredient));
    if (TRADABLE_TYPES.includes(entry.type) && !known) {
      added.push(ingredient);
    }
  }
  if (added.length === 0) {
    throw new LocalizedError("SODLTRADE.Errors.NothingImported");
  }
  return result(updateRecipe(crafting, recipeId, (current) => ({ ...current, ingredients: [...current.ingredients, ...added] })));
}

function addTools(crafting, { recipeId, entries }) {
  const recipe = findRecipe(crafting, recipeId);
  const added = [];
  for (const entry of entries) {
    const tool = { id: entry.id, sourceUuid: entry.sourceUuid, name: entry.name, img: entry.img };
    const known = [...(recipe.tools ?? []), ...added].some((existing) => isSameIngredient(existing, tool));
    if (TRADABLE_TYPES.includes(entry.type) && !known) {
      added.push(tool);
    }
  }
  if (added.length === 0) {
    throw new LocalizedError("SODLTRADE.Errors.NothingImported");
  }
  return result(updateRecipe(crafting, recipeId, (current) => ({ ...current, tools: [...(current.tools ?? []), ...added] })));
}

// The GM drops a profession, path, talent or ancestry, or types a word such as "forgeron".
function addRequirements(crafting, { recipeId, entries }) {
  const recipe = findRecipe(crafting, recipeId);
  const added = [];
  for (const entry of entries) {
    const requirement = { id: entry.id, sourceUuid: entry.sourceUuid ?? null, name: cleanText(entry.name), img: entry.img ?? "" };
    const allowed = REQUIREMENT_TYPES.includes(entry.type) || entry.type === TYPED_REQUIREMENT;
    const known = [...(recipe.requirements ?? []), ...added].some((existing) => isSameIngredient(existing, requirement));
    if (allowed && requirement.name !== "" && !known) {
      added.push(requirement);
    }
  }
  if (added.length === 0) {
    throw new LocalizedError("SODLTRADE.Errors.NothingImported");
  }
  return result(updateRecipe(crafting, recipeId, (current) => ({ ...current, requirements: [...(current.requirements ?? []), ...added] })));
}

function removeRequirement(crafting, { recipeId, requirementId }) {
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, requirements: (recipe.requirements ?? []).filter((requirement) => requirement.id !== requirementId) })));
}

function removeTool(crafting, { recipeId, toolId }) {
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, tools: (recipe.tools ?? []).filter((tool) => tool.id !== toolId) })));
}

function setIngredientQuantity(crafting, { recipeId, ingredientId, quantity }) {
  const count = toCount(quantity);
  return result(updateIngredient(crafting, recipeId, ingredientId, (ingredient) => ({ ...ingredient, quantity: count })));
}

function removeIngredient(crafting, { recipeId, ingredientId }) {
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, ingredients: recipe.ingredients.filter((ingredient) => ingredient.id !== ingredientId) })));
}

function toCost(text, defaultUnit) {
  if (cleanText(text) === "") {
    return null;
  }
  const cost = parsePrice(text, defaultUnit);
  if (!cost) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPrice");
  }
  if (isEmptyWealth(cost)) {
    return null;
  }
  return cost;
}

function setCost(crafting, { recipeId, text }, { defaultUnit }) {
  const cost = toCost(text, defaultUnit);
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, cost })));
}

// The time is only shown to the players: the GM decides what happens meanwhile.
function setTime(crafting, { recipeId, text }) {
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, time: cleanText(text) })));
}

function setCheck(crafting, { recipeId, attribute, boons }) {
  if (!CRAFT_ATTRIBUTES.includes(attribute)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidAttribute");
  }
  return result(updateRecipe(crafting, recipeId, (recipe) => ({ ...recipe, check: { attribute, boons: toBoons(boons) } })));
}

function toggleKnown(crafting, { recipeId, actorId }) {
  const recipe = findRecipe(crafting, recipeId);
  if (recipe.knownBy.includes(actorId)) {
    return result(updateRecipe(crafting, recipeId, (current) => ({ ...current, knownBy: current.knownBy.filter((id) => id !== actorId) })));
  }
  return result(updateRecipe(crafting, recipeId, (current) => ({ ...current, knownBy: [...current.knownBy, actorId] })), null, "learned");
}

function craftableRecipe(crafting, recipeId, actorId) {
  const recipe = findRecipe(crafting, recipeId);
  if (!recipe.knownBy.includes(actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.RecipeUnknown", { name: recipe.name });
  }
  if (!recipe.result) {
    throw new LocalizedError("SODLTRADE.Errors.NoResult", { name: recipe.name });
  }
  return recipe;
}

// When the GM validates crafting, the player only files a request; nothing is consumed yet.
function craft(crafting, { recipeId, actorId, orderId }, context) {
  const recipe = craftableRecipe(crafting, recipeId, actorId);
  if (context.requireApproval && !context.isGM) {
    const order = { id: orderId, actorId, recipeId, name: recipe.result.name, img: recipe.result.img };
    return result({ ...crafting, orders: [...(crafting.orders ?? []), order] }, null, "ordered", order);
  }
  return result(crafting, { actorId, recipe });
}

function findOrder(crafting, orderId) {
  const order = (crafting.orders ?? []).find((entry) => entry.id === orderId);
  if (!order) {
    throw new LocalizedError("SODLTRADE.Errors.OrderGone");
  }
  return order;
}

function withoutOrder(crafting, orderId) {
  return { ...crafting, orders: (crafting.orders ?? []).filter((order) => order.id !== orderId) };
}

function approveOrder(crafting, { orderId }) {
  const order = findOrder(crafting, orderId);
  const recipe = craftableRecipe(crafting, order.recipeId, order.actorId);
  return result(withoutOrder(crafting, orderId), { actorId: order.actorId, recipe }, "approved", order);
}

function rejectOrder(crafting, { orderId }) {
  const order = findOrder(crafting, orderId);
  return result(withoutOrder(crafting, orderId), null, "rejected", order);
}

function cancelOrder(crafting, { orderId }, context) {
  const order = findOrder(crafting, orderId);
  if (!context.isGM && !context.ownsActor(order.actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return result(withoutOrder(crafting, orderId), null, "cancelled", order);
}

const GM = "gm";
const OWNER = "owner";
const ANYONE = "anyone";

const ACTIONS = {
  addRecipe: { role: GM, run: addRecipe },
  addRecipes: { role: GM, run: addRecipes },
  renameRecipe: { role: GM, run: renameRecipe },
  removeRecipe: { role: GM, run: removeRecipe },
  setResult: { role: GM, run: setResult },
  setResultQuantity: { role: GM, run: setResultQuantity },
  addIngredients: { role: GM, run: addIngredients },
  setIngredientQuantity: { role: GM, run: setIngredientQuantity },
  removeIngredient: { role: GM, run: removeIngredient },
  addTools: { role: GM, run: addTools },
  removeTool: { role: GM, run: removeTool },
  addRequirements: { role: GM, run: addRequirements },
  removeRequirement: { role: GM, run: removeRequirement },
  setCost: { role: GM, run: setCost },
  setTime: { role: GM, run: setTime },
  setCheck: { role: GM, run: setCheck },
  toggleKnown: { role: GM, run: toggleKnown },
  craft: { role: OWNER, run: craft },
  approveOrder: { role: GM, run: approveOrder },
  rejectOrder: { role: GM, run: rejectOrder },
  cancelOrder: { role: ANYONE, run: cancelOrder }
};

export function applyCraftingAction(crafting, action, context) {
  const strategy = ACTIONS[action.type];
  if (!strategy) {
    throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
  }
  if (strategy.role === GM && !context.isGM) {
    throw new LocalizedError("SODLTRADE.Errors.NotAllowed");
  }
  if (strategy.role === OWNER && !context.isGM && !context.ownsActor(action.actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return strategy.run(crafting, action, context);
}
