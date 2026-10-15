import { modulePath } from "../../shared/constants.js";
import { errorMessage, isFeatureEnabled, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { knownRecipes, recipeStation } from "../../trade/crafting.js";
import { readCrafting } from "../../trade/crafting-store.js";
import { hasWritingKit, inkCost, planIncantation } from "../../trade/incantation.js";
import { toLabInventory } from "../../trade/inventory.js";
import { isPotion } from "../../trade/potion-mixing.js";
import { hasRecipeReference, planSpellBrew } from "../../trade/potion-spells.js";
import { BOOK_SPELLS, castingUpdate, findSpell } from "../../trade/spellcasting.js";
import { describeOffer } from "../../trade/trade-view.js";

const INCANTATION_TYPE = "I";
const MIXING_ROWS = ["transformed", "doubled", "combined", "oneFades", "allFade", "poison", "explosion"];
const MIXING_RANGES = { transformed: "18", doubled: "16–17", combined: "13–15", oneFades: "9–12", allFade: "6–8", poison: "4–5", explosion: "3" };

function sendLab(action) {
  sendRequest("lab", { action });
}

function costText(cost) {
  return describeOffer({ items: [], wealth: cost }, t);
}

// The reason an action is not possible, or "" when it is.
function blockedBy(check) {
  try {
    check();
  } catch (err) {
    return errorMessage(err);
  }
  return "";
}

function scriptoriumView(inventory) {
  const spells = inventory.spells.map((spell) => ({
    id: spell.id,
    name: spell.name,
    img: spell.img,
    rank: spell.rank,
    ink: costText(inkCost(spell.rank)),
    blocked: blockedBy(() => planIncantation({ rank: spell.rank, inventory }))
  }));
  const incantations = inventory.items
    .filter((item) => item.consumableType === INCANTATION_TYPE && item.contents.length > 0)
    .map((item) => {
      const rank = Number(item.contents[0].system?.rank) || 0;
      return { id: item.id, name: item.name, img: item.img, rank, ink: costText(inkCost(rank)), blocked: blockedBy(() => planIncantation({ rank, inventory })) };
    });
  return { hasKit: hasWritingKit(inventory), spells, incantations };
}

function castingsText(spell) {
  const used = Number(spell.system.castings?.value) || 0;
  const max = Number(spell.system.castings?.max) || 0;
  if (max === 0) {
    return "";
  }
  return t("SODLTRADE.Lab.Castings", { left: Math.max(0, max - used), max });
}

function spellView(spell) {
  if (!spell) {
    return null;
  }
  return { name: spell.name, castings: castingsText(spell), blocked: blockedBy(() => castingUpdate(spell)) };
}

function potionsOf(inventory) {
  return inventory.items.filter(isPotion).map((item) => ({ id: item.id, name: item.name, img: item.img, quantity: item.quantity }));
}

function alchemyView(actorId, inventory) {
  const identify = findSpell(inventory.spells, BOOK_SPELLS.identifySubstance);
  const brew = findSpell(inventory.spells, BOOK_SPELLS.brewPotion);
  let recipes = [];
  if (brew) {
    recipes = knownRecipes(readCrafting(), actorId)
      .filter((recipe) => recipe.result && recipeStation(recipe) === "cauldron")
      .map((recipe) => ({ id: recipe.id, name: recipe.result.name, img: recipe.result.img, blocked: blockedBy(() => planSpellBrew(recipe, inventory)) }));
  }
  let brewTime = t("SODLTRADE.Lab.Brew.Time");
  if (hasRecipeReference(inventory)) {
    brewTime = t("SODLTRADE.Lab.Brew.TimeReference");
  }
  return { identify: spellView(identify), brew: spellView(brew), recipes, brewTime };
}

function mixingTable() {
  return MIXING_ROWS.map((outcome) => ({ range: MIXING_RANGES[outcome], text: t(`SODLTRADE.Lab.Mix.Outcome.${outcome}`) }));
}

// The two potions picked to be mixed are only read when the button is pressed.
function selectedPotions(panel) {
  return [...panel.querySelectorAll("[data-lab-mix]")].map((select) => select.value);
}

// A potion with a single dose cannot be poured into itself: once picked on one side, it is greyed out on the other.
function refreshMix(panel) {
  const button = panel.querySelector("[data-action=labMix]");
  if (!button) {
    return;
  }
  const selects = [...panel.querySelectorAll("[data-lab-mix]")];
  for (const [index, select] of selects.entries()) {
    const other = selects[1 - index]?.value;
    for (const option of select.options) {
      option.disabled = option.value !== "" && option.value === other && Number(option.dataset.quantity) < 2;
    }
    if (select.selectedOptions[0]?.disabled) {
      select.value = "";
    }
  }
  const [first, second] = selectedPotions(panel);
  button.disabled = !first || !second;
}

export const labPanel = {
  id: "lab",
  template: modulePath("src/apps/panels/lab-panel.html"),

  // The laboratory follows the books' crafting rules, so it shares the crafting switch.
  enabled() {
    return isFeatureEnabled("crafting");
  },

  prepare(app, base) {
    const view = { mixingTable: mixingTable() };
    if (base.isGM) {
      return view;
    }
    const actor = game.actors.get(app.actingId);
    if (!actor) {
      return view;
    }
    const inventory = toLabInventory(actor);
    const potions = potionsOf(inventory);
    return {
      ...view,
      scriptorium: scriptoriumView(inventory),
      alchemy: alchemyView(actor.id, inventory),
      potions,
      canMix: potions.reduce((total, potion) => total + potion.quantity, 0) >= 2
    };
  },

  bind(app) {
    const panel = app.element.querySelector("[data-panel=lab]");
    for (const select of panel.querySelectorAll("[data-lab-mix]")) {
      select.addEventListener("change", () => refreshMix(panel));
    }
    refreshMix(panel);
  },

  actions: {
    labWrite(event, target) {
      sendLab({ type: "writeIncantation", actorId: this.actingId, spellId: target.dataset.spellId });
    },
    labCopy(event, target) {
      sendLab({ type: "copyIncantation", actorId: this.actingId, itemId: target.dataset.itemId });
    },
    labIdentify(event, target) {
      sendLab({ type: "identify", actorId: this.actingId, itemId: target.dataset.itemId });
    },
    labBrew(event, target) {
      sendLab({ type: "brew", actorId: this.actingId, recipeId: target.dataset.recipeId });
    },
    labMix(event, target) {
      const panel = target.closest("[data-panel=lab]");
      target.disabled = true;
      sendLab({ type: "mix", actorId: this.actingId, itemIds: selectedPotions(panel) });
    }
  }
};
