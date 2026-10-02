import { LocalizedError } from "../shared/i18n.js";
import { coversWealth, settleWealth } from "./wealth.js";

function assertOfferAvailable(offer, inventory) {
  for (const offered of offer.items) {
    const owned = inventory.items.find((item) => item.id === offered.itemId);
    if (!owned) {
      throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: offered.name });
    }
    if (owned.quantity < offered.quantity) {
      throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: owned.name });
    }
  }
  if (!coversWealth(inventory.wealth, offer.wealth)) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
  }
}

function planParty(party, other, inventory) {
  const deleteItemIds = [];
  const updateItems = [];
  for (const offered of party.offer.items) {
    const owned = inventory.items.find((item) => item.id === offered.itemId);
    const remaining = owned.quantity - offered.quantity;
    if (remaining === 0) {
      deleteItemIds.push(offered.itemId);
    } else {
      updateItems.push({ _id: offered.itemId, "system.quantity": remaining });
    }
  }
  return {
    actorId: party.actorId,
    wealth: settleWealth(inventory.wealth, party.offer.wealth, other.offer.wealth),
    deleteItemIds,
    updateItems,
    receiveItems: other.offer.items.map((item) => ({ sourceActorId: other.actorId, itemId: item.itemId, quantity: item.quantity }))
  };
}

export function planTransfer(trade, inventories) {
  trade.parties.forEach((party, index) => assertOfferAvailable(party.offer, inventories[index]));
  const [first, second] = trade.parties;
  return [planParty(first, second, inventories[0]), planParty(second, first, inventories[1])];
}

export function prepareReceivedItem(source, quantity) {
  const data = structuredClone(source);
  delete data._id;
  data.system.quantity = quantity;
  if ("wear" in data.system) {
    data.system.wear = false;
  }
  return data;
}
