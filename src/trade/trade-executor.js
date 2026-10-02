import { prepareReceivedItem } from "./transfer-plan.js";
import { DENOMINATIONS, emptyWealth, isEmptyWealth, settleWealth, toWealth } from "./wealth.js";

function receivedItems(change) {
  return change.receiveItems.map((entry) => {
    const source = game.actors.get(entry.sourceActorId).items.get(entry.itemId);
    return prepareReceivedItem(source.toObject(), entry.quantity);
  });
}

export function wealthUpdate(wealth) {
  return Object.fromEntries(DENOMINATIONS.map((denomination) => [`system.wealth.${denomination}`, wealth[denomination]]));
}

export async function executePlan(plan) {
  const received = plan.map(receivedItems);

  for (const [index, change] of plan.entries()) {
    if (received[index].length > 0) {
      await game.actors.get(change.actorId).createEmbeddedDocuments("Item", received[index]);
    }
  }

  for (const change of plan) {
    const actor = game.actors.get(change.actorId);
    if (change.updateItems.length > 0) {
      await actor.updateEmbeddedDocuments("Item", change.updateItems);
    }
    if (change.deleteItemIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", change.deleteItemIds);
    }
    await actor.update(wealthUpdate(change.wealth));
  }
}

// Loot is granted from the GM's client, which owns every actor.
export async function executeGrant(actor, grant) {
  const items = grant.items.map((entry) => prepareReceivedItem(entry.data, entry.quantity));
  if (items.length > 0) {
    await actor.createEmbeddedDocuments("Item", items);
  }
  if (!isEmptyWealth(grant.wealth)) {
    await actor.update(wealthUpdate(settleWealth(toWealth(actor.system.wealth), emptyWealth(), grant.wealth)));
  }
}

export async function executePurchase(actor, items, wealth) {
  await actor.createEmbeddedDocuments("Item", items);
  await actor.update(wealthUpdate(wealth));
}
