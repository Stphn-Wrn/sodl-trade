import { CRAFT_APPROVAL_SETTING, CRAFTING_SETTING, MODULE_ID, PRICE_UNIT_SETTING } from "../shared/constants.js";
import { isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { rollChallenge } from "./challenge-roll.js";
import { postCraftEvent, postCraftOrderEvent } from "./chat-log.js";
import { planCraft, resolveCheck } from "./craft-plan.js";
import { applyCraftingAction, emptyCrafting } from "./crafting.js";
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

export async function handleCraftingRequest(user, { action }) {
  const context = {
    isGM: user.isGM,
    ownsActor: ownsActor(user),
    defaultUnit: game.settings.get(MODULE_ID, PRICE_UNIT_SETTING),
    requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING)
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
  await game.settings.set(MODULE_ID, CRAFTING_SETTING, crafting);
  if (outcome) {
    await postCraftEvent(outcome.actor, craft.recipe, outcome.succeeded);
  } else if (order) {
    await postCraftOrderEvent(event, order);
  }
}
