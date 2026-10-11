import { HARVEST_SCARCITY_SETTING, HARVEST_SETTING, MODULE_ID } from "../shared/constants.js";
import { isPlayerCharacter, ownsActor } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { rollChallenge } from "./challenge-roll.js";
import { postHarvestEvent } from "./chat-log.js";
import { resolveCheck } from "./craft-plan.js";
import { applyHarvestAction, drawCount, drawHarvest, emptyHarvest, seedHarvestMap } from "./harvest.js";
import { loadResourceCatalog } from "./resource-store.js";
import { resourceItemData } from "./resources.js";
import { prepareReceivedItem } from "./transfer-plan.js";

export function readHarvest() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, HARVEST_SETTING) ?? emptyHarvest());
}

// Until the GM changes anything, the map is the one built from the shipped catalog.
export async function harvestMap(harvest) {
  if (harvest.map) {
    return harvest.map;
  }
  return seedHarvestMap(await loadResourceCatalog(), game.i18n.lang);
}

function harvester(actorId) {
  const actor = game.actors.get(actorId);
  if (!isPlayerCharacter(actor)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  return actor;
}

// The same line found twice in one search is given as a single stack.
function mergeFinds(finds) {
  const merged = [];
  for (const find of finds) {
    const existing = merged.find((entry) => entry.entry.id === find.entry.id);
    if (existing) {
      existing.quantity += find.quantity;
    } else {
      merged.push({ ...find });
    }
  }
  return merged;
}

function resourceFlag(item) {
  return item.getFlag(MODULE_ID, "resource");
}

// A catalog resource comes in the GM's version when there is one (edited price, description);
// any other item the GM dropped in the biome comes from where it was dropped from.
async function sourceData(catalog, entry) {
  if (entry.resourceKey) {
    const worldItem = game.items.find((item) => resourceFlag(item) === entry.resourceKey);
    if (worldItem) {
      return worldItem.toObject();
    }
    const resource = catalog.folders.flatMap((folder) => folder.items).find((item) => item.key === entry.resourceKey);
    if (resource) {
      return resourceItemData(resource, game.i18n.lang);
    }
  }
  const source = await fromUuid(entry.sourceUuid);
  if (!source) {
    throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: entry.name });
  }
  return source.toObject();
}

function carriedStack(actor, entry, data) {
  if (entry.resourceKey) {
    return actor.items.find((item) => resourceFlag(item) === entry.resourceKey);
  }
  return actor.items.find((item) => item.type === data.type && item.name === data.name);
}

// Found items join a stack the character already carries, so ingredients do not pile up as separate items.
async function giveResources(actor, catalog, finds) {
  const created = [];
  const updated = [];
  for (const find of finds) {
    const data = await sourceData(catalog, find.entry);
    const stack = carriedStack(actor, find.entry, data);
    if (stack) {
      updated.push({ _id: stack.id, "system.quantity": (Number(stack.system.quantity) || 0) + find.quantity });
    } else {
      created.push(prepareReceivedItem(data, find.quantity));
    }
  }
  if (updated.length > 0) {
    await actor.updateEmbeddedDocuments("Item", updated);
  }
  if (created.length > 0) {
    await actor.createEmbeddedDocuments("Item", created);
  }
  return [...updated.map((update) => actor.items.get(update._id).name), ...created.map((data) => data.name)];
}

async function completeHarvest({ actorId, entries, check }) {
  const actor = harvester(actorId);
  const catalog = await loadResourceCatalog();
  const total = await rollChallenge(actor, resolveCheck(check));
  const scarcity = game.settings.get(MODULE_ID, HARVEST_SCARCITY_SETTING);
  const finds = [];
  for (let draw = 0; draw < drawCount(total); draw += 1) {
    const find = drawHarvest(entries, scarcity, Math.random);
    if (find) {
      finds.push(find);
    }
  }
  const merged = mergeFinds(finds);
  const names = await giveResources(actor, catalog, merged);
  return { actor, succeeded: drawCount(total) > 0, found: merged.map((find, index) => ({ name: names[index], quantity: find.quantity })) };
}

// The character is served before the harvest is saved, so a failure leaves them free to try again.
export async function handleHarvestRequest(user, { action }) {
  const current = readHarvest();
  current.map = await harvestMap(current);
  const { harvest, attempt, event } = applyHarvestAction(current, action, { isGM: user.isGM, ownsActor: ownsActor(user) });
  let outcome = null;
  if (attempt) {
    outcome = await completeHarvest(attempt);
  }
  await game.settings.set(MODULE_ID, HARVEST_SETTING, harvest);
  if (outcome) {
    const place = harvest.map.biomes.find((biome) => biome.id === attempt.biome)?.name ?? "";
    await postHarvestEvent(outcome, place);
  }
  return event;
}
