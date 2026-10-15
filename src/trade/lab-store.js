import { CRAFTING_SETTING, MODULE_ID, PRICE_UNIT_SETTING } from "../shared/constants.js";
import { isPlayerCharacter, ownsActor, t } from "../shared/foundry-adapter.js";
import { LocalizedError } from "../shared/i18n.js";
import { ALCHEMIST_KIT_NAMES, CRAFTING_TIME, POTION_MAKERS } from "./book-requirements.js";
import { postLabEvent } from "./chat-log.js";
import { recipeStation } from "./crafting.js";
import { readCrafting } from "./crafting-store.js";
import { buildRequirement } from "./default-recipes.js";
import { incantationItemData, planIncantation } from "./incantation.js";
import { toLabInventory } from "./inventory.js";
import { EXPLOSION_DAMAGE, MIXING_ROLL, mixingOutcome, mixtureItemData, planMix } from "./potion-mixing.js";
import { learnPotionRecipe, planSpellBrew, recipeFromPotion } from "./potion-spells.js";
import { localizedName } from "./resources.js";
import { findByNames } from "./recipe-import.js";
import { BOOK_SPELLS, castingUpdate, findSpell } from "./spellcasting.js";
import { executeCraft } from "./trade-executor.js";
import { prepareReceivedItem } from "./transfer-plan.js";

const INCANTATION_TYPE = "I";

function labActor(user, actorId) {
  const actor = game.actors.get(actorId);
  if (!isPlayerCharacter(actor)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidPartner");
  }
  if (!user.isGM && !ownsActor(user)(actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return actor;
}

function ownedItem(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item) {
    throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: "" });
  }
  return item;
}

function bookSpell(actor, names) {
  const spell = findSpell(toLabInventory(actor).spells, names);
  if (!spell) {
    throw new LocalizedError("SODLTRADE.Errors.SpellNotLearned", { name: names[0] });
  }
  return spell;
}

// Without the item it was copied from, a recipe would lose its result as soon as the potion is drunk.
function stableSource(item) {
  return item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? null;
}

async function fallbackRecipe(item) {
  const sourceUuid = stableSource(item);
  if (!sourceUuid) {
    return null;
  }
  const lang = game.i18n.lang;
  const kit = await findByNames(ALCHEMIST_KIT_NAMES);
  const id = foundry.utils.randomID();
  let tool = null;
  if (kit) {
    tool = { id: `${id}-tool-0`, sourceUuid: kit.uuid, name: kit.name, img: kit.img };
  }
  return recipeFromPotion({
    id,
    potion: { name: item.name, img: item.img, value: item.system.value, sourceUuid },
    kit: tool,
    requirements: POTION_MAKERS.map((requirement, index) => buildRequirement(requirement, index, id, lang)),
    time: localizedName(CRAFTING_TIME, lang),
    defaultUnit: game.settings.get(MODULE_ID, PRICE_UNIT_SETTING)
  });
}

// Rolls go to the chat through the system's dice, so everyone sees them like any other roll.
async function rollInChat(actor, formula, flavor) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  return roll.total;
}

const ACTIONS = {
  // Core rulebook, Creating Incantations: a spell the character has learned, a writing kit, inks worth half the price, 1 hour.
  async writeIncantation(actor, { spellId }) {
    const spell = actor.items.get(spellId);
    if (spell?.type !== "spell") {
      throw new LocalizedError("SODLTRADE.Errors.SpellNotLearned", { name: "" });
    }
    const plan = planIncantation({ rank: spell.system.rank, inventory: toLabInventory(actor) });
    const incantation = incantationItemData(spell.toObject(), game.i18n.localize("DL.ConsumableTypeI"));
    await executeCraft(actor, { deleteItemIds: [], updateItems: [], wealth: plan.wealth }, [incantation]);
    await postLabEvent(actor, "incantationWritten", { item: incantation.name });
  },

  // "...or copy an incantation you already possess", with the same kit and inks.
  async copyIncantation(actor, { itemId }) {
    const original = ownedItem(actor, itemId);
    const spell = original.system.contents?.[0];
    if (original.system.consumabletype !== INCANTATION_TYPE || !spell) {
      throw new LocalizedError("SODLTRADE.Errors.NotAnIncantation", { name: original.name });
    }
    const plan = planIncantation({ rank: spell.system?.rank, inventory: toLabInventory(actor) });
    await executeCraft(actor, { deleteItemIds: [], updateItems: [], wealth: plan.wealth }, [prepareReceivedItem(original.toObject(), 1)]);
    await postLabEvent(actor, "incantationCopied", { item: original.name });
  },

  // Demon Lord's Companion, Identify Substance (Alchemy 0): the potion's name, what it does, and its recipe.
  async identify(actor, { itemId }) {
    const spell = bookSpell(actor, BOOK_SPELLS.identifySubstance);
    const casting = castingUpdate(spell);
    const item = ownedItem(actor, itemId);
    const potion = { name: item.name, sourceUuids: [stableSource(item), item._stats?.duplicateSource].filter(Boolean) };
    const { crafting, recipe } = learnPotionRecipe(readCrafting(), { actorId: actor.id, potion, fallback: await fallbackRecipe(item) });
    await actor.updateEmbeddedDocuments("Item", [casting]);
    await game.settings.set(MODULE_ID, CRAFTING_SETTING, crafting);
    await postLabEvent(actor, "identified", { item: item.name, recipe: recipe.name });
  },

  // Demon Lord's Companion, Brew Potion (Alchemy 1): a known recipe, an hour with the alchemist's kit, a container.
  async brew(actor, { recipeId }) {
    const recipe = readCrafting().recipes.find((entry) => entry.id === recipeId);
    if (!recipe?.result || !recipe.knownBy.includes(actor.id)) {
      throw new LocalizedError("SODLTRADE.Errors.RecipeUnknown", { name: recipe?.name ?? "" });
    }
    if (recipeStation(recipe) !== "cauldron") {
      throw new LocalizedError("SODLTRADE.Errors.NotAPotion", { name: recipe.result.name });
    }
    const spell = bookSpell(actor, BOOK_SPELLS.brewPotion);
    const casting = castingUpdate(spell);
    const plan = planSpellBrew(recipe, toLabInventory(actor));
    const source = await fromUuid(recipe.result.sourceUuid);
    if (!source) {
      throw new LocalizedError("SODLTRADE.Errors.ItemGone", { name: recipe.result.name });
    }
    await actor.updateEmbeddedDocuments("Item", [casting]);
    await executeCraft(actor, plan, [prepareReceivedItem(source.toObject(), 1)]);
    await postLabEvent(actor, "spellBrewed", { item: recipe.result.name });
  },

  // Demon Lord's Companion, Mixing Potions: pouring one potion into another, the GM rolls 3d6 on the table.
  async mix(actor, { itemIds }) {
    const { potions, plan } = planMix({ itemIds, items: toLabInventory(actor).items });
    const names = potions.map((potion) => potion.name).join(" + ");
    const outcome = mixingOutcome(await rollInChat(actor, MIXING_ROLL, t("SODLTRADE.Lab.Mix.RollFlavor", { names })));
    const mixture = mixtureItemData(outcome, potions, t);
    const crafted = [];
    if (mixture) {
      crafted.push(mixture);
    }
    await executeCraft(actor, { ...plan, wealth: null }, crafted);
    await postLabEvent(actor, `mixed.${outcome}`, { names });
    if (outcome === "explosion") {
      await rollInChat(actor, EXPLOSION_DAMAGE, t("SODLTRADE.Lab.Mix.ExplosionFlavor"));
    }
  }
};

export async function handleLabRequest(user, { action }) {
  const strategy = ACTIONS[action.type];
  if (!strategy) {
    throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
  }
  await strategy(labActor(user, action.actorId), action);
}
