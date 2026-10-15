import { CRAFT_APPROVAL_SETTING, CRAFTING_SETTING, MODULE_ID, PRICE_UNIT_SETTING } from "../shared/constants.js";
import { extensions } from "../shared/extensions.js";
import { isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { rollChallenge } from "./challenge-roll.js";
import { postCraftEvent, postCraftOrderEvent } from "./chat-log.js";
import { planCraft, resolveCheck } from "./craft-plan.js";
import { applyCraftingAction, emptyCrafting } from "./crafting.js";
import { handleLabRequest } from "./lab-store.js";
import { toCraftingInventory } from "./inventory.js";
import { executeCraft } from "./trade-executor.js";
import { prepareReceivedItem } from "./transfer-plan.js";

export function readCrafting() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, CRAFTING_SETTING) ?? emptyCrafting());
}

function crafter(actorId) {
  const actor = game.actors.get(actorId);
  if (!isPlayerCharacter(actor)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  return actor;
}

// Everything is checked before the roll, so a missing ingredient never costs the character anything.
async function completeCraft({ actorId, recipe }) {
  const actor = crafter(actorId);
  const source = await fromUuid(recipe.result.sourceUuid);
  if (!source) {
    throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: recipe.result.name });
  }
  const plan = planCraft(recipe, toCraftingInventory(actor));
  const check = resolveCheck(recipe.check);
  const succeeded = check.succeeded(await rollChallenge(actor, check));
  let crafted = [];
  if (succeeded) {
    crafted = [prepareReceivedItem(source.toObject(), recipe.result.quantity)];
  }
  await executeCraft(actor, plan, crafted);
  return { actor, succeeded };
}

function assertCanCraft(order, crafting) {
  const recipe = crafting.recipes.find((entry) => entry.id === order.recipeId);
  planCraft(recipe, toCraftingInventory(crafter(order.actorId)));
}

// What the GM sees in the order list for each kind of creation: the item made, or what goes into it.
function itemsNamed(actor, itemIds) {
  const items = (itemIds ?? []).map((itemId) => actor.items.get(itemId)).filter(Boolean);
  return { name: items.map((item) => item.name).join(" + "), img: items[0]?.img ?? "" };
}

function itemNamed(actor, itemId) {
  const item = actor.items.get(itemId);
  return { name: item?.name ?? "", img: item?.img ?? "" };
}

const CREATIONS = {
  lab: {
    writeIncantation: (actor, action) => itemNamed(actor, action.spellId),
    copyIncantation: (actor, action) => itemNamed(actor, action.itemId),
    brew: (actor, action) => {
      const recipe = readCrafting().recipes.find((entry) => entry.id === action.recipeId);
      return { name: recipe?.result?.name ?? "", img: recipe?.result?.img ?? "" };
    },
    mix: (actor, action) => itemsNamed(actor, action.itemIds)
  }
};

// An extension's creation is described by the extension itself, falling back on the items it uses.
function describeCreation(type, actor, action) {
  const describe = CREATIONS[type]?.[action.type] ?? extensions.request(type)?.describeCreation;
  if (describe) {
    return describe(actor, action);
  }
  return itemsNamed(actor, action.itemIds);
}

function approvedHandler(type) {
  if (type === "lab") {
    return handleLabRequest;
  }
  return extensions.request(type).handler;
}

// A player's creation outside a recipe becomes an order the GM approves or rejects; nothing is spent before.
export async function requestCreation(user, request) {
  const action = request.data.action;
  const { name, img } = describeCreation(request.type, crafter(action.actorId), action);
  await handleCraftingRequest(user, { action: { type: "requestCreation", actorId: action.actorId, orderId: foundry.utils.randomID(), name, img, request } });
}

export async function handleCraftingRequest(user, { action }) {
  const context = {
    isGM: user.isGM,
    ownsActor: ownsActor(user),
    defaultUnit: game.settings.get(MODULE_ID, PRICE_UNIT_SETTING),
    requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING),
    discover: (rule) => extensions.recipeDiscovery(rule)
  };
  const { crafting, craft, event, order } = applyCraftingAction(readCrafting(), action, context);
  // A request without the ingredients would only be refused later, so it is refused now.
  if (event === "ordered") {
    assertCanCraft(order, crafting);
  }
  let outcome = null;
  if (craft) {
    outcome = await completeCraft(craft);
  }
  // Run before the order is removed, so a creation that fails stays in the list.
  if (event === "approved" && order.request) {
    await approvedHandler(order.request.type)(user, order.request.data);
  }
  await game.settings.set(MODULE_ID, CRAFTING_SETTING, crafting);
  if (outcome) {
    await postCraftEvent(outcome.actor, craft.recipe, outcome.succeeded);
  } else if (order) {
    await postCraftOrderEvent(event, order);
  }
}
