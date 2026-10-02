import { LocalizedError } from "../shared/i18n.js";
import { TRADABLE_TYPES, sourceQuantity } from "./inventory.js";
import { parsePrice } from "./price.js";
import { multiplyWealth } from "./wealth.js";

// Availability codes used by the demonlord system: common, uncommon, rare, exotic, or none.
export const AVAILABILITIES = ["", "C", "U", "R", "E"];

export function emptyShop() {
  return { categories: [] };
}

function findCategory(shop, categoryId) {
  const category = shop.categories.find((entry) => entry.id === categoryId);
  if (!category) {
    throw new LocalizedError("SODLTRADE.Errors.CategoryGone");
  }
  return category;
}

function findItem(shop, categoryId, itemId) {
  const item = findCategory(shop, categoryId).items.find((entry) => entry.id === itemId);
  if (!item) {
    throw new LocalizedError("SODLTRADE.Errors.ShopItemGone");
  }
  return item;
}

function updateCategory(shop, categoryId, change) {
  findCategory(shop, categoryId);
  return { ...shop, categories: shop.categories.map((category) => {
    if (category.id === categoryId) {
      return change(category);
    }
    return category;
  }) };
}

function updateItem(shop, categoryId, itemId, change) {
  findItem(shop, categoryId, itemId);
  return updateCategory(shop, categoryId, (category) => ({ ...category, items: category.items.map((item) => {
    if (item.id === itemId) {
      return change(item);
    }
    return item;
  }) }));
}

function toAvailability(value) {
  if (AVAILABILITIES.includes(value)) {
    return value;
  }
  return "";
}

function toShopItem(entry, defaultUnit) {
  return {
    id: entry.id,
    sourceUuid: entry.sourceUuid,
    name: entry.name,
    img: entry.img,
    bundle: sourceQuantity({ system: { quantity: entry.quantity } }),
    price: parsePrice(entry.value, defaultUnit),
    availability: toAvailability(entry.availability)
  };
}

function result(shop, purchase = null) {
  return { shop, purchase };
}

function addCategory(shop, { id, name }) {
  return result({ ...shop, categories: [...shop.categories, { id, name: String(name ?? "").trim(), items: [] }] });
}

function renameCategory(shop, { categoryId, name }) {
  return result(updateCategory(shop, categoryId, (category) => ({ ...category, name: String(name ?? "").trim() })));
}

function removeCategory(shop, { categoryId }) {
  findCategory(shop, categoryId);
  return result({ ...shop, categories: shop.categories.filter((category) => category.id !== categoryId) });
}

function addItems(shop, { categoryId, entries }, { defaultUnit }) {
  const category = findCategory(shop, categoryId);
  const known = new Set(category.items.map((item) => item.sourceUuid));
  const added = entries
    .filter((entry) => TRADABLE_TYPES.includes(entry.type) && !known.has(entry.sourceUuid))
    .map((entry) => toShopItem(entry, defaultUnit));
  if (added.length === 0) {
    throw new LocalizedError("SODLTRADE.Errors.NothingImported");
  }
  return result(updateCategory(shop, categoryId, (current) => ({ ...current, items: [...current.items, ...added] })));
}

function removeItem(shop, { categoryId, itemId }) {
  findItem(shop, categoryId, itemId);
  return result(updateCategory(shop, categoryId, (category) => ({ ...category, items: category.items.filter((item) => item.id !== itemId) })));
}

function setPrice(shop, { categoryId, itemId, text }, { defaultUnit }) {
  const price = parsePrice(text, defaultUnit);
  if (!price) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPrice");
  }
  return result(updateItem(shop, categoryId, itemId, (item) => ({ ...item, price })));
}

function setAvailability(shop, { categoryId, itemId, availability }) {
  if (!AVAILABILITIES.includes(availability)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidAvailability");
  }
  return result(updateItem(shop, categoryId, itemId, (item) => ({ ...item, availability })));
}

function buy(shop, { categoryId, itemId, actorId, quantity }) {
  const item = findItem(shop, categoryId, itemId);
  if (!item.price) {
    throw new LocalizedError("SODLTRADE.Errors.NoPrice", { name: item.name });
  }
  const lots = Math.trunc(Number(quantity));
  if (!Number.isFinite(lots) || lots < 1) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  return result(shop, { actorId, sourceUuid: item.sourceUuid, name: item.name, units: lots * item.bundle, cost: multiplyWealth(item.price, lots) });
}

const GM = "gm";
const OWNER = "owner";

const ACTIONS = {
  addCategory: { role: GM, run: addCategory },
  renameCategory: { role: GM, run: renameCategory },
  removeCategory: { role: GM, run: removeCategory },
  addItems: { role: GM, run: addItems },
  removeItem: { role: GM, run: removeItem },
  setPrice: { role: GM, run: setPrice },
  setAvailability: { role: GM, run: setAvailability },
  buy: { role: OWNER, run: buy }
};

export function applyShopAction(shop, action, context) {
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
  return strategy.run(shop, action, context);
}
