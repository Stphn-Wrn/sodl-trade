import { MODULE_ID, SHOP_APPROVAL_SETTING, modulePath } from "../../shared/constants.js";
import { errorMessage, ownedCharacterIds, t } from "../../shared/foundry-adapter.js";
import { LocalizedError } from "../../shared/i18n.js";
import { sendRequest } from "../../socket.js";
import { AVAILABILITIES, openCategories } from "../../trade/shop.js";
import { readShop } from "../../trade/shop-store.js";
import { createShieldResolver, nearbyItemsOf } from "../../trade/shield-resolver.js";
import { describeOffer } from "../../trade/trade-view.js";
import { isEmptyWealth, toWealth } from "../../trade/wealth.js";

function sendShop(action) {
  sendRequest("shop", { action });
}

function availabilityLabel(code) {
  if (code === "") {
    return t("SODLTRADE.Shop.Availability.None");
  }
  return t(`SODLTRADE.Shop.Availability.${code}`);
}

function priceText(price) {
  if (!price) {
    return "";
  }
  return describeOffer({ items: [], wealth: price }, t);
}

function stockView(stock) {
  if (stock === null) {
    return { stock: "", limited: false, outOfStock: false, stockLabel: "" };
  }
  if (stock === 0) {
    return { stock: 0, limited: true, outOfStock: true, stockLabel: t("SODLTRADE.Shop.OutOfStock") };
  }
  return { stock, limited: true, outOfStock: false, stockLabel: t("SODLTRADE.Shop.Stock", { count: stock }) };
}

function itemView(item) {
  return {
    id: item.id,
    name: item.name,
    img: item.img,
    bundle: item.bundle,
    isBundle: item.bundle > 1,
    priceText: priceText(item.price),
    hasPrice: Boolean(item.price),
    availability: item.availability,
    availabilityLabel: availabilityLabel(item.availability),
    ...stockView(item.stock ?? null),
    availabilities: AVAILABILITIES.map((code) => ({ code, label: availabilityLabel(code), selected: code === item.availability }))
  };
}

async function toEntries(items, nearbyItems) {
  const partnerOf = await createShieldResolver(nearbyItems);
  const entries = [];
  for (const item of items) {
    const partner = await partnerOf(item);
    const linkedUuids = [];
    if (partner) {
      linkedUuids.push(partner.uuid);
    }
    entries.push({ ...toEntry(item), linkedUuids });
  }
  return entries;
}

function describeWealth(wealth) {
  if (isEmptyWealth(wealth)) {
    return t("SODLTRADE.Window.NoMoney");
  }
  return describeOffer({ items: [], wealth }, t);
}

function orderCostInput(cost) {
  if (isEmptyWealth(cost)) {
    return "0";
  }
  return describeOffer({ items: [], wealth: cost }, t);
}

function orderView(order) {
  const actor = game.actors.get(order.actorId);
  let purse = "";
  if (actor) {
    purse = describeWealth(toWealth(actor.system.wealth));
  }
  return {
    id: order.id,
    buyer: actor?.name ?? "",
    buyerImg: actor?.img ?? "",
    purse,
    name: order.name,
    img: order.img,
    units: order.units,
    lots: order.lots,
    cost: describeWealth(order.cost),
    costInput: orderCostInput(order.cost)
  };
}

function visibleOrders(isGM) {
  const orders = readShop().orders ?? [];
  if (isGM) {
    return orders;
  }
  const mine = ownedCharacterIds();
  return orders.filter((order) => mine.includes(order.actorId));
}

function toEntry(item) {
  return {
    id: foundry.utils.randomID(),
    sourceUuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type,
    value: item.system?.value,
    quantity: item.system?.quantity,
    availability: item.system?.availability
  };
}

async function resolveFolder(reference) {
  const ref = String(reference ?? "").trim();
  let folder = game.folders.get(ref);
  if (!folder && ref.includes(".")) {
    folder = await fromUuid(ref);
  }
  if (!folder || folder.documentName !== "Folder" || folder.type !== "Item") {
    throw new LocalizedError("SODLTRADE.Errors.FolderNotFound");
  }
  return folder;
}

// Items of a folder and all of its subfolders, whether the folder lives in the world or in a compendium.
async function folderItems(folder) {
  const folderIds = new Set([folder, ...folder.getSubfolders(true)].map((entry) => entry.id));
  if (folder.pack) {
    const documents = await game.packs.get(folder.pack).getDocuments();
    return documents.filter((item) => folderIds.has(item.folder?.id));
  }
  return game.items.filter((item) => folderIds.has(item.folder?.id));
}

async function importFolder(categoryId, folder) {
  const items = await folderItems(folder);
  sendShop({ type: "addItems", categoryId, entries: await toEntries(items, items) });
}

async function dropOnCategory(event, categoryId) {
  event.preventDefault();
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
  try {
    if (data?.type === "Folder") {
      await importFolder(categoryId, await resolveFolder(data.uuid));
      return;
    }
    if (data?.type !== "Item") {
      return;
    }
    const item = await fromUuid(data.uuid);
    if (item) {
      sendShop({ type: "addItems", categoryId, entries: await toEntries([item], nearbyItemsOf(item)) });
    }
  } catch (err) {
    ui.notifications.warn(errorMessage(err));
  }
}

export const shopPanel = {
  id: "shop",
  template: modulePath("src/apps/panels/shop-panel.html"),

  isOpen() {
    return openCategories(readShop()).length > 0;
  },

  // Pending purchase orders, shown on the tab so the GM notices them.
  badge() {
    if (!game.user.isGM) {
      return 0;
    }
    return (readShop().orders ?? []).length;
  },

  prepare(app, base) {
    const editing = base.isGM && app.shopEditing;
    const shop = readShop();
    const openIds = openCategories(shop).map((category) => category.id);
    let categories = shop.categories.map((category) => ({
      id: category.id,
      name: category.name,
      open: category.open !== false,
      collapsed: app.collapsedCategories.has(category.id),
      canRestock: category.items.some((item) => (item.restock ?? null) !== null),
      items: category.items.map(itemView)
    }));
    if (!base.isGM) {
      categories = categories.filter((category) => openIds.includes(category.id));
    }
    return {
      categories,
      editing,
      isEmpty: categories.length === 0,
      canRestock: categories.some((category) => category.canRestock),
      requireApproval: game.settings.get(MODULE_ID, SHOP_APPROVAL_SETTING),
      orders: visibleOrders(base.isGM).map(orderView)
    };
  },

  bind(app) {
    if (!game.user.isGM) {
      return;
    }
    const panel = app.element.querySelector("[data-panel=shop]");
    for (const zone of panel.querySelectorAll("[data-shop-dropzone]")) {
      zone.addEventListener("dragover", (event) => event.preventDefault());
      zone.addEventListener("drop", (event) => dropOnCategory(event, zone.dataset.shopDropzone));
    }
    for (const input of panel.querySelectorAll("[data-category-name]")) {
      input.addEventListener("change", () => sendShop({ type: "renameCategory", categoryId: input.dataset.categoryName, name: input.value }));
    }
    for (const input of panel.querySelectorAll("[data-shop-price]")) {
      const [categoryId, itemId] = input.dataset.shopPrice.split("/");
      input.addEventListener("change", () => sendShop({ type: "setPrice", categoryId, itemId, text: input.value }));
    }
    for (const input of panel.querySelectorAll("[data-order-cost]")) {
      input.addEventListener("change", () => sendShop({ type: "setOrderCost", orderId: input.dataset.orderCost, text: input.value }));
    }
    for (const input of panel.querySelectorAll("[data-order-lots]")) {
      input.addEventListener("change", () => sendShop({ type: "setOrderLots", orderId: input.dataset.orderLots, lots: input.value }));
    }
    for (const input of panel.querySelectorAll("[data-shop-stock]")) {
      const [categoryId, itemId] = input.dataset.shopStock.split("/");
      input.addEventListener("change", () => sendShop({ type: "setStock", categoryId, itemId, stock: input.value }));
    }
    for (const select of panel.querySelectorAll("[data-shop-availability]")) {
      const [categoryId, itemId] = select.dataset.shopAvailability.split("/");
      select.addEventListener("change", () => sendShop({ type: "setAvailability", categoryId, itemId, availability: select.value }));
    }
  },

  actions: {
    shopToggleEdit() {
      this.shopEditing = !this.shopEditing;
      this.render();
    },
    shopToggleCategory(event, target) {
      const categoryId = target.dataset.categoryId;
      if (this.collapsedCategories.has(categoryId)) {
        this.collapsedCategories.delete(categoryId);
      } else {
        this.collapsedCategories.add(categoryId);
      }
      this.render();
    },
    shopToggleCategoryOpen(event, target) {
      sendShop({ type: "setCategoryOpen", categoryId: target.dataset.categoryId, open: target.dataset.open !== "true" });
    },
    shopRestock(event, target) {
      sendShop({ type: "restock", categoryId: target.dataset.categoryId });
    },
    shopAddCategory() {
      const input = this.element.querySelector("[name=newCategory]");
      sendShop({ type: "addCategory", id: foundry.utils.randomID(), name: input.value || t("SODLTRADE.Shop.Unnamed") });
    },
    shopRemoveCategory(event, target) {
      sendShop({ type: "removeCategory", categoryId: target.dataset.categoryId });
    },
    async shopImport(event, target) {
      const categoryId = target.dataset.categoryId;
      const reference = this.element.querySelector(`[data-folder-ref="${categoryId}"]`).value;
      try {
        await importFolder(categoryId, await resolveFolder(reference));
      } catch (err) {
        ui.notifications.warn(errorMessage(err));
      }
    },
    shopRemoveItem(event, target) {
      sendShop({ type: "removeItem", categoryId: target.dataset.categoryId, itemId: target.dataset.itemId });
    },
    shopBuy(event, target) {
      const { categoryId, itemId } = target.dataset;
      const quantity = this.element.querySelector(`[data-buy-quantity="${categoryId}/${itemId}"]`).value;
      sendShop({ type: "buy", categoryId, itemId, actorId: this.actingId, quantity, orderId: foundry.utils.randomID() });
    },
    shopApproveOrder(event, target) {
      sendShop({ type: "approveOrder", orderId: target.dataset.orderId });
    },
    shopRejectOrder(event, target) {
      sendShop({ type: "rejectOrder", orderId: target.dataset.orderId });
    },
    shopCancelOrder(event, target) {
      sendShop({ type: "cancelOrder", orderId: target.dataset.orderId });
    }
  }
};
