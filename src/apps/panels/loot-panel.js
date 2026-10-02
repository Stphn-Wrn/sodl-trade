import { modulePath } from "../../shared/constants.js";
import { isPlayerCharacter, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { readLoot } from "../../trade/loot-store.js";
import { splitWealth } from "../../trade/loot.js";
import { describeOffer } from "../../trade/trade-view.js";
import { isEmptyWealth } from "../../trade/wealth.js";
import { readWealthInputs, wealthRows } from "./panel-helpers.js";

function sendLoot(action) {
  sendRequest("loot", { action });
}

function splitIds(app, base) {
  return base.characters.map((actor) => actor.id).filter((id) => !app.excludedFromSplit.has(id));
}

export const lootPanel = {
  id: "loot",
  template: modulePath("src/apps/panels/loot-panel.html"),

  prepare(app, base) {
    const loot = readLoot();
    const ids = splitIds(app, base);
    let sharePreview = "";
    if (ids.length > 0 && !isEmptyWealth(loot.wealth)) {
      sharePreview = describeOffer({ items: [], wealth: splitWealth(loot.wealth, ids.length).share }, t);
    }
    return {
      items: loot.items.map(({ id, name, img, quantity }) => ({ id, name, img, quantity })),
      wealth: wealthRows(loot.wealth),
      hasWealth: !isEmptyWealth(loot.wealth),
      isEmpty: loot.items.length === 0 && isEmptyWealth(loot.wealth),
      split: {
        characters: base.characters.map((actor) => ({ id: actor.id, name: actor.name, checked: !app.excludedFromSplit.has(actor.id) })),
        count: ids.length,
        sharePreview
      }
    };
  },

  bind(app) {
    if (!game.user.isGM) {
      return;
    }
    const panel = app.element.querySelector("[data-panel=loot]");
    const zone = panel.querySelector(".sodl-trade-dropzone");
    zone.addEventListener("dragover", (event) => event.preventDefault());
    zone.addEventListener("drop", (event) => lootPanel.drop(event));

    for (const input of panel.querySelectorAll("[data-loot-quantity]")) {
      input.addEventListener("change", () => sendLoot({ type: "setQuantity", id: input.dataset.lootQuantity, quantity: input.value }));
    }
    for (const input of panel.querySelectorAll("[data-loot-wealth]")) {
      input.addEventListener("change", () => sendLoot({ type: "setWealth", wealth: readWealthInputs(panel, "data-loot-wealth") }));
    }
    for (const input of panel.querySelectorAll("[data-split-actor]")) {
      input.addEventListener("change", () => {
        if (input.checked) {
          app.excludedFromSplit.delete(input.dataset.splitActor);
        } else {
          app.excludedFromSplit.add(input.dataset.splitActor);
        }
        app.render();
      });
    }
  },

  async drop(event) {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") {
      return;
    }
    const item = await fromUuid(data.uuid);
    if (!item) {
      return;
    }
    const itemData = game.items.fromCompendium(item, { clearFolder: true, clearSort: true, clearOwnership: true });
    sendLoot({ type: "add", id: foundry.utils.randomID(), sourceUuid: item.uuid, data: itemData });
  },

  actions: {
    lootRemove(event, target) {
      sendLoot({ type: "setQuantity", id: target.dataset.id, quantity: 0 });
    },
    lootSplit() {
      const actorIds = game.actors.filter(isPlayerCharacter).map((actor) => actor.id).filter((id) => !this.excludedFromSplit.has(id));
      sendLoot({ type: "split", actorIds });
    },
    lootTake(event, target) {
      const id = target.dataset.id;
      const quantity = this.element.querySelector(`[data-take-quantity="${id}"]`).value;
      sendLoot({ type: "take", actorId: this.actingId, id, quantity });
    },
    lootTakeWealth() {
      const panel = this.element.querySelector("[data-panel=loot]");
      sendLoot({ type: "takeWealth", actorId: this.actingId, wealth: readWealthInputs(panel, "data-take-wealth") });
    }
  }
};
