import { createShieldResolver } from "./shield-resolver.js";
import { unpairedShieldHalves } from "./shield-pairs.js";
import { prepareReceivedItem } from "./transfer-plan.js";
import { DENOMINATIONS, emptyWealth, isEmptyWealth, settleWealth, toWealth } from "./wealth.js";

function shieldView(item) {
  return { name: item.name, type: item.type, isShield: item.system?.isShield === true };
}

// A shield half that arrives without its other half (a character who only had the weapon half, for instance)
// brings it along from the world or the compendiums, so the new owner gets both the Defense and the bash.
async function shieldPartners(actor, sources, resolver) {
  const received = sources.map(({ source, quantity }) => ({ ...shieldView(source), quantity, source }));
  const missing = unpairedShieldHalves(received, actor.items.map(shieldView));
  const partners = [];
  for (const entry of missing) {
    const partnerOf = await resolver();
    const partner = await partnerOf(entry.source);
    if (partner) {
      partners.push(prepareReceivedItem(partner.toObject(), entry.quantity));
    }
  }
  return partners;
}

async function receivedItems(change, resolver) {
  const sources = change.receiveItems.map((entry) => ({ source: game.actors.get(entry.sourceActorId).items.get(entry.itemId), quantity: entry.quantity }));
  const items = sources.map(({ source, quantity }) => prepareReceivedItem(source.toObject(), quantity));
  const partners = await shieldPartners(game.actors.get(change.actorId), sources, resolver);
  return [...items, ...partners];
}

// The shield lookup reads the compendium indexes, so it is only built when a trade needs it.
function lazyShieldResolver() {
  let resolver = null;
  return async () => {
    if (!resolver) {
      resolver = await createShieldResolver();
    }
    return resolver;
  };
}

export function wealthUpdate(wealth) {
  return Object.fromEntries(DENOMINATIONS.map((denomination) => [`system.wealth.${denomination}`, wealth[denomination]]));
}

export async function executePlan(plan) {
  const resolver = lazyShieldResolver();
  const received = [];
  for (const change of plan) {
    received.push(await receivedItems(change, resolver));
  }

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
