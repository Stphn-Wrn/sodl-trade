import { LOOT_SETTING, MODULE_ID } from "../shared/constants.js";
import { isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { postLootEvent } from "./chat-log.js";
import { applyLootAction, emptyLoot } from "./loot.js";
import { executeGrant } from "./trade-executor.js";

export function readLoot() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, LOOT_SETTING) ?? emptyLoot());
}

function recipient(actorId) {
  const actor = game.actors.get(actorId);
  if (!isPlayerCharacter(actor)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  return actor;
}

// Characters are served before the pool is saved: if Foundry fails midway, the group keeps the loot rather than losing it.
export async function handleLootRequest(user, { action }) {
  const { loot, grants, event } = applyLootAction(readLoot(), action, { isGM: user.isGM, ownsActor: ownsActor(user) });
  const actors = grants.map((grant) => recipient(grant.actorId));
  for (const [index, grant] of grants.entries()) {
    await executeGrant(actors[index], grant);
  }
  await game.settings.set(MODULE_ID, LOOT_SETTING, loot);
  if (event) {
    await postLootEvent(event, grants);
  }
}
