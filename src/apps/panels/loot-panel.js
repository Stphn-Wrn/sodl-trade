import { modulePath } from "../../shared/constants.js";
import { isPlayerCharacter, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { readLoot } from "../../trade/loot-store.js";
import { splitWealth, visibleWealth } from "../../trade/loot.js";
import { describeOffer } from "../../trade/trade-view.js";
import { isEmptyWealth } from "../../trade/wealth.js";
import { readWealthInputs, wealthRows } from "./panel-helpers.js";

function sendLoot(action) {
  sendRequest("loot", { action });
}

function splitIds(app, characters) {
  return characters.map((actor) => actor.id).filter((id) => !app.excludedFromSplit.has(id));
}

function describeWealth(wealth) {
  return describeOffer({ items: [], wealth }, t);
}

function splitView(app, characters, wealth) {
  const ids = splitIds(app, characters);
  let sharePreview = "";
  if (ids.length > 0) {
    const { share } = splitWealth(wealth, ids.length);
    if (!isEmptyWealth(share)) {
      sharePreview = describeWealth(share);
    }
  }
  return {
    characters: characters.map((actor) => ({ id: actor.id, name: actor.name, included: !app.excludedFromSplit.has(actor.id) })),
    count: ids.length,
    sharePreview
  };
}

function gmView(app, base, loot) {
  return {
    editing: app.lootEditing,
    open: loot.open === true,
    items: loot.items.map(({ id, name, img, quantity, revealed }) => ({ id, name, img, quantity, revealed: revealed === true })),
    itemCount: loot.items.length,
    wealth: wealthRows(loot.wealth),
    wealthText: describeWealth(loot.wealth),
    hasWealth: !isEmptyWealth(loot.wealth),
    wealthRevealed: loot.wealthRevealed === true,
    hasHidden: loot.items.some((item) => !item.revealed) || (!loot.wealthRevealed && !isEmptyWealth(loot.wealth)),
    split: splitView(app, base.characters, loot.wealth)
  };
}

function playerView(loot) {
  const items = loot.items.filter((item) => item.revealed).map(({ id, name, img, quantity }) => ({ id, name, img, quantity }));
  const wealth = visibleWealth(loot);
  return {
    items,
    itemCount: items.length,
    wealth: wealthRows(wealth),
    hasWealth: !isEmptyWealth(wealth),
    isEmpty: items.length === 0 && isEmptyWealth(wealth)
  };
}

export const lootPanel = {
  id: "loot",
  template: modulePath("src/apps/panels/loot-panel.html"),

  isOpen() {
    return readLoot().open === true;
  },

  prepare(app, base) {
    const loot = readLoot();
    if (base.isGM) {
      return gmView(app, base, loot);
    }
    return playerView(loot);
  },

  bind(app) {
    if (!game.user.isGM || !app.lootEditing) {
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
    lootToggleEdit() {
      this.lootEditing = !this.lootEditing;
      this.render();
    },
    lootToggleSplit(event, target) {
      const actorId = target.dataset.actorId;
      if (this.excludedFromSplit.has(actorId)) {
        this.excludedFromSplit.delete(actorId);
      } else {
        this.excludedFromSplit.add(actorId);
      }
      this.render();
    },
    lootToggleReveal(event, target) {
      sendLoot({ type: "setRevealed", id: target.dataset.id, revealed: target.dataset.revealed !== "true" });
    },
    lootToggleWealthReveal() {
      sendLoot({ type: "setWealthRevealed", revealed: !readLoot().wealthRevealed });
    },
    lootRevealAll() {
      sendLoot({ type: "revealAll" });
    },
    lootToggleOpen() {
      sendLoot({ type: "setOpen", open: !readLoot().open });
    },
    lootRemove(event, target) {
      sendLoot({ type: "setQuantity", id: target.dataset.id, quantity: 0 });
    },
    lootSplit() {
      sendLoot({ type: "split", actorIds: splitIds(this, game.actors.filter(isPlayerCharacter)) });
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
