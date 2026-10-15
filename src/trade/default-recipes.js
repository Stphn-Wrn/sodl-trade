import { localizedName } from "./resources.js";
import { parsePrice } from "./price.js";
import { emptyWealth, fromBits, isEmptyWealth, toBits } from "./wealth.js";

// The system's compendiums store item prices in silver shillings: the book's 2 ss healing potion is "2".
const ITEM_PRICE_UNIT = "ss";
const AUTO_COST = "auto";

// A recipe points at an item either by catalog resource or by its possible names (English and French books).
export function refKey(ref) {
  if (ref.resource) {
    return `resource:${ref.resource}`;
  }
  return `names:${ref.names.join("|")}`;
}

function priceOf(found) {
  return parsePrice(String(found.value ?? ""), ITEM_PRICE_UNIT) ?? emptyWealth();
}

// Demon Lord's Companion: materials are worth a quarter of the item's price.
// The ingredients the recipe already asks for count towards it; the rest is paid in money.
function autoCost(result, ingredients) {
  const quarter = Math.ceil(toBits(priceOf(result)) / 4);
  const supplied = ingredients.reduce((total, { found, quantity }) => total + toBits(priceOf(found)) * quantity, 0);
  const cost = fromBits(Math.max(0, quarter - supplied));
  if (isEmptyWealth(cost)) {
    return null;
  }
  return cost;
}

function costOf(definition, result, ingredients) {
  if (definition.cost === AUTO_COST) {
    return autoCost(result, ingredients);
  }
  if (!definition.cost) {
    return null;
  }
  return parsePrice(definition.cost, ITEM_PRICE_UNIT);
}

// A requirement is shown in the table's language and recognised under every name it has.
export function buildRequirement(requirement, index, id, lang) {
  return {
    id: `${id}-req-${index}`,
    sourceUuid: null,
    name: localizedName(requirement.name, lang),
    img: "",
    aliases: [...Object.values(requirement.name), ...(requirement.aliases ?? [])]
  };
}

function buildRecipe(definition, lang, resolved) {
  const id = `default-${definition.key}`;
  const result = resolved.get(refKey(definition.result));
  const ingredients = definition.ingredients.map((ingredient) => ({ found: resolved.get(refKey(ingredient.ref)), quantity: ingredient.quantity }));
  const tools = definition.tools.map((ref) => resolved.get(refKey(ref)));
  let quantity = definition.quantity;
  if (!quantity) {
    quantity = result.quantity;
  }
  return {
    id,
    key: definition.key,
    name: localizedName(definition.name, lang),
    station: definition.station,
    result: { sourceUuid: result.uuid, name: result.name, img: result.img, quantity },
    ingredients: ingredients.map(({ found, quantity: count }, index) => ({ id: `${id}-${index}`, sourceUuid: found.uuid, name: found.name, img: found.img, quantity: count })),
    tools: tools.map((found, index) => ({ id: `${id}-tool-${index}`, sourceUuid: found.uuid, name: found.name, img: found.img })),
    requirements: (definition.requirements ?? []).map((requirement, index) => buildRequirement(requirement, index, id, lang)),
    cost: costOf(definition, result, ingredients),
    time: localizedName(definition.time, lang),
    check: { ...definition.check },
    knownBy: []
  };
}

function refsOf(definition) {
  return [definition.result, ...definition.ingredients.map((ingredient) => ingredient.ref), ...definition.tools];
}

// Recipes whose items cannot all be found (a book the GM does not own, a deleted resource) are left out and listed.
// Recipes already added are recognised by their key, even if the GM renamed them.
export function planRecipeImport(definitions, lang, resolved, existingKeys) {
  const recipes = [];
  const skipped = [];
  for (const definition of definitions) {
    if (existingKeys.includes(definition.key)) {
      continue;
    }
    if (!refsOf(definition).every((ref) => resolved.get(refKey(ref)))) {
      skipped.push(localizedName(definition.name, lang));
      continue;
    }
    recipes.push(buildRecipe(definition, lang, resolved));
  }
  return { recipes, skipped };
}

export function recipeRefs(definitions) {
  return definitions.flatMap(refsOf);
}
