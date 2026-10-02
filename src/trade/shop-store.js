import { MODULE_ID, PRICE_UNIT_SETTING, SHOP_SETTING } from "../shared/constants.js";
import { isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { postPurchaseEvent } from "./chat-log.js";
import { applyShopAction, emptyShop } from "./shop.js";
import { executePurchase } from "./trade-executor.js";
import { prepareReceivedItem } from "./transfer-plan.js";
import { payWithChange, toWealth } from "./wealth.js";

export function readShop() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, SHOP_SETTING) ?? emptyShop());
}

async function completePurchase(purchase) {
  const actor = game.actors.get(purchase.actorId);
  if (!isPlayerCharacter(actor)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  const source = await fromUuid(purchase.sourceUuid);
  if (!source) {
    throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: purchase.name });
  }
  const wealth = payWithChange(toWealth(actor.system.wealth), purchase.cost);
  if (!wealth) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
  }
  await executePurchase(actor, prepareReceivedItem(source.toObject(), purchase.units), wealth);
  await postPurchaseEvent(actor, purchase);
}

export async function handleShopRequest(user, { action }) {
  const context = { isGM: user.isGM, ownsActor: ownsActor(user), defaultUnit: game.settings.get(MODULE_ID, PRICE_UNIT_SETTING) };
  const { shop, purchase } = applyShopAction(readShop(), action, context);
  // The stock only goes down once the buyer has paid and received the item.
  if (purchase) {
    await completePurchase(purchase);
  }
  await game.settings.set(MODULE_ID, SHOP_SETTING, shop);
}
