import { modulePath } from "../../shared/constants.js";
import { errorMessage, t } from "../../shared/foundry-adapter.js";
import { LocalizedError } from "../../shared/i18n.js";
import { sendRequest } from "../../socket.js";
import { AVAILABILITIES } from "../../trade/shop.js";
import { readShop } from "../../trade/shop-store.js";
import { describeOffer } from "../../trade/trade-view.js";

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
    availabilities: AVAILABILITIES.map((code) => ({ code, label: availabilityLabel(code), selected: code === item.availability }))
  };
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
  sendShop({ type: "addItems", categoryId, entries: items.map(toEntry) });
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
      sendShop({ type: "addItems", categoryId, entries: [toEntry(item)] });
    }
  } catch (err) {
    ui.notifications.warn(errorMessage(err));
  }
}

export const shopPanel = {
  id: "shop",
  template: modulePath("src/apps/panels/shop-panel.html"),

  prepare(app, base) {
    const editing = base.isGM && app.shopEditing;
    let categories = readShop().categories.map((category) => ({
      id: category.id,
      name: category.name,
      collapsed: app.collapsedCategories.has(category.id),
      items: category.items.map(itemView)
    }));
    if (!base.isGM) {
      categories = categories.filter((category) => category.items.length > 0);
    }
    return { categories, editing, isEmpty: categories.length === 0 };
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
      sendShop({ type: "buy", categoryId, itemId, actorId: this.actingId, quantity });
    }
  }
};
