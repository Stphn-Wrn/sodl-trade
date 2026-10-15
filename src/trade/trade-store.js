import { CRAFT_APPROVAL_SETTING, MODULE_ID, TRADES_SETTING } from "../shared/constants.js";
import { errorMessage, isFeatureEnabled, isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { extensions } from "../shared/extensions.js";
import { featureOfRequest, needsApproval } from "../shared/features.js";
import { LocalizedError } from "../shared/i18n.js";
import { postTradeEvent } from "./chat-log.js";
import { handleCraftingRequest, requestCreation } from "./crafting-store.js";
import { handleHarvestRequest } from "./harvest-store.js";
import { handleLabRequest } from "./lab-store.js";
import { handleLootRequest } from "./loot-store.js";
import { handleShopRequest } from "./shop-store.js";
import { resolveRole, toInventory } from "./inventory.js";
import { FINAL_STATUSES, STATUS, applyAction, createTrade, reopenTrade } from "./trade.js";
import { executePlan } from "./trade-executor.js";
import { planTransfer } from "./transfer-plan.js";

export function readTrades() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, TRADES_SETTING) ?? {});
}

export function getTrade(tradeId) {
  return readTrades()[tradeId] ?? null;
}

export function roleOf(trade, user) {
  return resolveRole(trade, user, ownsActor(user));
}

function saveTrades(trades) {
  return game.settings.set(MODULE_ID, TRADES_SETTING, trades);
}

function identity(actor) {
  return { actorId: actor.id, name: actor.name, img: actor.img };
}

function partyActor(party) {
  const actor = game.actors.get(party.actorId);
  if (!actor) {
    throw new LocalizedError("SODLTRADE.Errors.ActorMissing");
  }
  return actor;
}

function involves(trade, actorIds) {
  return actorIds.every((actorId) => trade.parties.some((party) => party.actorId === actorId));
}

async function create(user, { initiatorActorId, targetActorId }, trades) {
  const initiator = game.actors.get(initiatorActorId);
  const target = game.actors.get(targetActorId);
  if (user.isGM || !isPlayerCharacter(initiator) || !initiator.testUserPermission(user, "OWNER")) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  if (!isPlayerCharacter(target) || target.id === initiator.id) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  if (Object.values(trades).some((trade) => involves(trade, [initiator.id, target.id]))) {
    throw new LocalizedError("SODLTRADE.Errors.AlreadyTrading");
  }
  const trade = createTrade({ id: foundry.utils.randomID(), initiator: identity(initiator), target: identity(target) });
  trades[trade.id] = trade;
  await saveTrades(trades);
  await postTradeEvent("created", trade);
}

async function complete(trade, inventories, trades) {
  try {
    await executePlan(planTransfer(trade, inventories));
  } catch (err) {
    console.error(`${MODULE_ID} | Trade ${trade.id} failed`, err);
    trades[trade.id] = reopenTrade(trade);
    await saveTrades(trades);
    await postTradeEvent("failed", trade, { reason: errorMessage(err) });
    return;
  }
  delete trades[trade.id];
  await saveTrades(trades);
  await postTradeEvent("completed", trade);
}

async function act(user, { tradeId, action }, trades) {
  const trade = trades[tradeId];
  if (!trade) {
    throw new LocalizedError("SODLTRADE.Errors.TradeNotFound");
  }
  const inventories = trade.parties.map((party) => toInventory(partyActor(party)));
  const { trade: next, event } = applyAction(trade, action, { role: roleOf(trade, user), inventories });

  if (next.status === STATUS.APPROVED) {
    await complete(next, inventories, trades);
    return;
  }
  if (FINAL_STATUSES.includes(next.status)) {
    delete trades[tradeId];
  } else {
    trades[tradeId] = next;
  }
  await saveTrades(trades);
  if (event) {
    await postTradeEvent(event, next, { user: user.name });
  }
}

const REQUESTS = { create, act, loot: handleLootRequest, shop: handleShopRequest, crafting: handleCraftingRequest, lab: handleLabRequest, harvest: handleHarvestRequest };

// An extension has its own switch; the core's requests follow the feature they belong to.
function requestEnabled(type, extension) {
  if (extension) {
    return extension.enabled();
  }
  return isFeatureEnabled(featureOfRequest(type));
}

let queue = Promise.resolve();

async function run(userId, request, onError) {
  try {
    const extension = extensions.request(request.type);
    const handler = REQUESTS[request.type] ?? extension?.handler;
    if (!handler) {
      throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
    }
    // A player's window may still show a part the GM has just turned off.
    if (!requestEnabled(request.type, extension)) {
      throw new LocalizedError("SODLTRADE.Errors.FeatureDisabled");
    }
    const user = game.users.get(userId);
    if (needsApproval(request, { isGM: user.isGM, requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING) })) {
      await requestCreation(user, request);
      return;
    }
    await handler(user, request.data, readTrades());
  } catch (err) {
    if (!err?.localized) {
      console.error(`${MODULE_ID} | Request failed`, err);
    }
    onError(userId, err);
  }
}

// Requests are handled one at a time so two players editing the same trade cannot overwrite each other.
export function processRequest(userId, request, onError) {
  queue = queue.then(() => run(userId, request, onError));
  return queue;
}
