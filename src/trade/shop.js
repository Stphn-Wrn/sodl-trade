import { LocalizedError } from "../shared/i18n.js";
import { TRADABLE_TYPES, sourceQuantity } from "./inventory.js";
import { parsePrice } from "./price.js";
import { fromBits, multiplyWealth, toBits } from "./wealth.js";

// Availability codes used by the demonlord system: common, uncommon, rare, exotic, or none.
export const AVAILABILITIES = ["", "C", "U", "R", "E"];

export function emptyShop() {
  return { categories: [], orders: [] };
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
    availability: toAvailability(entry.availability),
    stock: null,
    linkedUuids: entry.linkedUuids ?? []
  };
}

// An empty stock means the merchant never runs out.
function toStock(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const stock = Math.trunc(Number(value));
  if (!Number.isFinite(stock) || stock < 0) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  return stock;
}

function result(shop, purchase = null, event = null, order = null) {
  return { shop, purchase, event, order };
}

// A new shop starts closed so the GM can stock it before players see it.
function addCategory(shop, { id, name }) {
  return result({ ...shop, categories: [...shop.categories, { id, name: String(name ?? "").trim(), open: false, items: [] }] });
}

function setCategoryOpen(shop, { categoryId, open }) {
  return result(updateCategory(shop, categoryId, (category) => ({ ...category, open: open === true })));
}

// Shops created before shops could be closed have no "open" flag and stay open.
function isCategoryOpen(category) {
  return category.open !== false;
}

export function openCategories(shop) {
  return shop.categories.filter((category) => isCategoryOpen(category) && category.items.length > 0);
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
  // An item already for sale, or the other half of a shield already for sale, is skipped.
  const known = new Set(category.items.flatMap((item) => [item.sourceUuid, ...(item.linkedUuids ?? [])]));
  const added = [];
  // The weapon half of a shield comes last, so the armor half (which carries the Defense bonus) is the one shown.
  const isShieldWeapon = (entry) => entry.type === "weapon" && (entry.linkedUuids ?? []).length > 0;
  const ordered = [...entries.filter((entry) => !isShieldWeapon(entry)), ...entries.filter(isShieldWeapon)];
  for (const entry of ordered) {
    if (!TRADABLE_TYPES.includes(entry.type) || known.has(entry.sourceUuid)) {
      continue;
    }
    const item = toShopItem(entry, defaultUnit);
    added.push(item);
    known.add(item.sourceUuid);
    item.linkedUuids.forEach((uuid) => known.add(uuid));
  }
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

// The stock the GM enters is also the level a restock brings the item back to.
function setStock(shop, { categoryId, itemId, stock }) {
  const value = toStock(stock);
  return result(updateItem(shop, categoryId, itemId, (item) => ({ ...item, stock: value, restock: value })));
}

function restockItem(item) {
  const level = item.restock ?? null;
  if (level === null) {
    return item;
  }
  return { ...item, stock: level };
}

function restock(shop, { categoryId }) {
  if (categoryId) {
    return result(updateCategory(shop, categoryId, (category) => ({ ...category, items: category.items.map(restockItem) })));
  }
  return result({ ...shop, categories: shop.categories.map((category) => ({ ...category, items: category.items.map(restockItem) })) });
}

function assertInStock(item, lots) {
  const stock = item.stock ?? null;
  if (stock === null) {
    return;
  }
  if (stock === 0) {
    throw new LocalizedError("SODLTRADE.Errors.OutOfStock", { name: item.name });
  }
  if (lots > stock) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughStock", { name: item.name, stock });
  }
}

function withdrawStock(item, lots) {
  const stock = item.stock ?? null;
  if (stock === null) {
    return item;
  }
  return { ...item, stock: stock - lots };
}

function toLots(quantity) {
  const lots = Math.trunc(Number(quantity));
  if (!Number.isFinite(lots) || lots < 1) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  return lots;
}

// What the buyer gets and pays, fixed when they ask so a later price change does not surprise them.
function quote(item, lots) {
  if (!item.price) {
    throw new LocalizedError("SODLTRADE.Errors.NoPrice", { name: item.name });
  }
  assertInStock(item, lots);
  return { sourceUuid: item.sourceUuid, linkedUuids: item.linkedUuids ?? [], name: item.name, units: lots * item.bundle, lots, cost: fromBits(toBits(multiplyWealth(item.price, lots))) };
}

function sell(shop, categoryId, itemId, actorId, lots, deal) {
  const item = findItem(shop, categoryId, itemId);
  assertInStock(item, lots);
  const next = updateItem(shop, categoryId, itemId, (current) => withdrawStock(current, lots));
  return { shop: next, purchase: { actorId, ...deal } };
}

function findOrder(shop, orderId) {
  const order = (shop.orders ?? []).find((entry) => entry.id === orderId);
  if (!order) {
    throw new LocalizedError("SODLTRADE.Errors.OrderGone");
  }
  return order;
}

function withoutOrder(shop, orderId) {
  return { ...shop, orders: (shop.orders ?? []).filter((order) => order.id !== orderId) };
}

// When the GM validates purchases, buying only files an order; nothing is paid or taken from the stock yet.
function buy(shop, { categoryId, itemId, actorId, quantity, orderId }, context) {
  if (!isCategoryOpen(findCategory(shop, categoryId))) {
    throw new LocalizedError("SODLTRADE.Errors.ShopClosed");
  }
  const item = findItem(shop, categoryId, itemId);
  const lots = toLots(quantity);
  const deal = quote(item, lots);
  if (context.requireApproval && !context.isGM) {
    const { sourceUuid, linkedUuids, name, units, cost } = deal;
    const order = { id: orderId, actorId, categoryId, itemId, name, img: item.img, lots, units, cost, sourceUuid, linkedUuids };
    return result({ ...shop, orders: [...(shop.orders ?? []), order] }, null, "ordered", order);
  }
  const sale = sell(shop, categoryId, itemId, actorId, lots, deal);
  return result(sale.shop, sale.purchase);
}

function approveOrder(shop, { orderId }) {
  const order = findOrder(shop, orderId);
  const { sourceUuid, linkedUuids, name, units, lots, cost } = order;
  const sale = sell(withoutOrder(shop, orderId), order.categoryId, order.itemId, order.actorId, lots, { sourceUuid, linkedUuids, name, units, lots, cost });
  return result(sale.shop, sale.purchase, "approved", order);
}

function updateOrder(shop, orderId, change) {
  const order = findOrder(shop, orderId);
  const updated = change(order);
  return result({ ...shop, orders: shop.orders.map((entry) => {
    if (entry.id === orderId) {
      return updated;
    }
    return entry;
  }) }, null, "updated", updated);
}

// The GM can settle on another total price before approving, down to 0 for a gift.
function setOrderCost(shop, { orderId, text }, { defaultUnit }) {
  const cost = parsePrice(text, defaultUnit);
  if (!cost) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPrice");
  }
  return updateOrder(shop, orderId, (order) => ({ ...order, cost }));
}

// Changing the quantity scales the units delivered and the price in proportion.
function setOrderLots(shop, { orderId, lots }) {
  const value = toLots(lots);
  return updateOrder(shop, orderId, (order) => ({
    ...order,
    lots: value,
    units: (order.units / order.lots) * value,
    cost: fromBits(Math.round((toBits(order.cost) / order.lots) * value))
  }));
}

function rejectOrder(shop, { orderId }) {
  const order = findOrder(shop, orderId);
  return result(withoutOrder(shop, orderId), null, "rejected", order);
}

function cancelOrder(shop, { orderId }, context) {
  const order = findOrder(shop, orderId);
  if (!context.isGM && !context.ownsActor(order.actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return result(withoutOrder(shop, orderId), null, "cancelled", order);
}

const GM = "gm";
const OWNER = "owner";
const ANYONE = "anyone";

const ACTIONS = {
  addCategory: { role: GM, run: addCategory },
  renameCategory: { role: GM, run: renameCategory },
  setCategoryOpen: { role: GM, run: setCategoryOpen },
  removeCategory: { role: GM, run: removeCategory },
  addItems: { role: GM, run: addItems },
  removeItem: { role: GM, run: removeItem },
  setPrice: { role: GM, run: setPrice },
  setAvailability: { role: GM, run: setAvailability },
  setStock: { role: GM, run: setStock },
  restock: { role: GM, run: restock },
  buy: { role: OWNER, run: buy },
  approveOrder: { role: GM, run: approveOrder },
  rejectOrder: { role: GM, run: rejectOrder },
  setOrderCost: { role: GM, run: setOrderCost },
  setOrderLots: { role: GM, run: setOrderLots },
  cancelOrder: { role: ANYONE, run: cancelOrder }
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
