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

// Each offered item moves with the items linked to it, such as the weapon half of a shield.
function movedItems(offer, inventory) {
  return offer.items.flatMap((offered) => {
    const owned = inventory.items.find((item) => item.id === offered.itemId);
    const linked = (owned.linked ?? [])
      .map((link) => ({ id: link.id, owned: link.quantity, moved: Math.min(offered.quantity, link.quantity) }))
      .filter((link) => link.moved > 0);
    return [{ id: owned.id, owned: owned.quantity, moved: offered.quantity }, ...linked];
  });
}

function planParty(party, ownMoves, otherMoves, other, inventory) {
  const deleteItemIds = [];
  const updateItems = [];
  for (const move of ownMoves) {
    const remaining = move.owned - move.moved;
    if (remaining === 0) {
      deleteItemIds.push(move.id);
    } else {
      updateItems.push({ _id: move.id, "system.quantity": remaining });
    }
  }
  return {
    actorId: party.actorId,
    wealth: settleWealth(inventory.wealth, party.offer.wealth, other.offer.wealth),
    deleteItemIds,
    updateItems,
    receiveItems: otherMoves.map((move) => ({ sourceActorId: other.actorId, itemId: move.id, quantity: move.moved }))
  };
}

export function planTransfer(trade, inventories) {
  trade.parties.forEach((party, index) => assertOfferAvailable(party.offer, inventories[index]));
  const [first, second] = trade.parties;
  const firstMoves = movedItems(first.offer, inventories[0]);
  const secondMoves = movedItems(second.offer, inventories[1]);
  return [planParty(first, firstMoves, secondMoves, second, inventories[0]), planParty(second, secondMoves, firstMoves, first, inventories[1])];
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
