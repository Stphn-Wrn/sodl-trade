import { MODULE_ID, modulePath } from "../shared/constants.js";
import { t } from "../shared/foundry-adapter.js";
import { sendRequest } from "../socket.js";
import { readCrafting } from "./crafting-store.js";
import { planRecipeImport, recipeRefs, refKey } from "./default-recipes.js";
import { sourceQuantity } from "./inventory.js";
import { importResources } from "./resource-store.js";

function normalize(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();
}

function describe(uuid, entry) {
  return { uuid, name: entry.name, img: entry.img, type: entry.type, value: entry.system?.value, quantity: sourceQuantity(entry) };
}

function worldResource(key) {
  return game.items.find((item) => item.getFlag(MODULE_ID, "resource") === key);
}

function describeResource(key) {
  const item = worldResource(key);
  if (!item) {
    return null;
  }
  return describe(item.uuid, item);
}

// Book items are looked up by name in the world first, then in every item compendium (translated names included).
export async function findByNames(names) {
  const wanted = names.map(normalize);
  const worldItem = game.items.find((item) => wanted.includes(normalize(item.name)));
  if (worldItem) {
    return describe(worldItem.uuid, worldItem);
  }
  for (const pack of game.packs.filter((entry) => entry.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["system.value", "system.quantity"] });
    const entry = index.find((candidate) => wanted.includes(normalize(candidate.name)));
    if (entry) {
      return describe(entry.uuid, entry);
    }
  }
  return null;
}

async function resolveRefs(refs) {
  const resolved = new Map();
  for (const ref of refs) {
    const key = refKey(ref);
    if (resolved.has(key)) {
      continue;
    }
    if (ref.resource) {
      resolved.set(key, describeResource(ref.resource));
    } else {
      resolved.set(key, await findByNames(ref.names));
    }
  }
  return resolved;
}

// Runs on the GM's client. The resources the recipes use are created first if the world lacks them.
export async function importDefaultRecipes() {
  const response = await fetch(modulePath("data/recipes.json"), { cache: "no-cache" });
  const { recipes: definitions } = await response.json();
  const refs = recipeRefs(definitions);
  if (refs.some((ref) => ref.resource && !worldResource(ref.resource))) {
    await importResources();
  }
  const existingKeys = readCrafting().recipes.map((recipe) => recipe.key).filter(Boolean);
  const { recipes, skipped } = planRecipeImport(definitions, game.i18n.lang, await resolveRefs(refs), existingKeys);
  if (skipped.length > 0) {
    ui.notifications.warn(t("SODLTRADE.Notify.RecipesSkipped", { names: skipped.join(", ") }));
  }
  if (recipes.length === 0) {
    ui.notifications.info(t("SODLTRADE.Notify.RecipesUpToDate"));
    return;
  }
  sendRequest("crafting", { action: { type: "addRecipes", recipes } });
  ui.notifications.info(t("SODLTRADE.Notify.RecipesImported", { count: recipes.length }));
}
