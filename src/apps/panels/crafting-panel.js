import { CRAFT_APPROVAL_SETTING, MODULE_ID, modulePath } from "../../shared/constants.js";
import { errorMessage, isFeatureEnabled, ownedCharacterIds, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { ingredientStatus, planCraft, requirementStatus, toolStatus } from "../../trade/craft-plan.js";
import { CRAFT_ATTRIBUTES, knownRecipes } from "../../trade/crafting.js";
import { readCrafting } from "../../trade/crafting-store.js";
import { importDefaultRecipes } from "../../trade/recipe-import.js";
import { importResources } from "../../trade/resource-store.js";
import { toCraftingInventory } from "../../trade/inventory.js";
import { describeOffer } from "../../trade/trade-view.js";

const ATTRIBUTE_LABELS = { strength: "DL.AttributeStrength", agility: "DL.AttributeAgility", intellect: "DL.AttributeIntellect", will: "DL.AttributeWill" };

function sendCrafting(action) {
  sendRequest("crafting", { action });
}

function attributeLabel(attribute) {
  if (attribute === "") {
    return t("SODLTRADE.Crafting.NoCheck");
  }
  return t(ATTRIBUTE_LABELS[attribute]);
}

function boonsText(boons) {
  if (boons > 0) {
    return t("SODLTRADE.Crafting.Boons", { count: boons });
  }
  if (boons < 0) {
    return t("SODLTRADE.Crafting.Banes", { count: -boons });
  }
  return "";
}

function checkText(check) {
  if (!check.attribute) {
    return "";
  }
  const text = t("SODLTRADE.Crafting.Check", { attribute: attributeLabel(check.attribute) });
  const modifier = boonsText(check.boons);
  if (modifier === "") {
    return text;
  }
  return `${text} (${modifier})`;
}

function costText(cost) {
  if (!cost) {
    return "";
  }
  return describeOffer({ items: [], wealth: cost }, t);
}

// Without a character to craft with (the GM, or a player browsing), ingredients are listed without counts.
function ingredientRows(recipe, inventory) {
  if (!inventory) {
    return recipe.ingredients.map((ingredient) => ({ ...ingredient, showOwned: false, isMissing: false }));
  }
  return ingredientStatus(recipe, inventory).map((ingredient) => ({ ...ingredient, showOwned: true, isMissing: ingredient.missing > 0 }));
}

function toolRows(recipe, inventory) {
  if (!inventory) {
    return (recipe.tools ?? []).map((tool) => ({ ...tool, showOwned: false, isMissing: false }));
  }
  return toolStatus(recipe, inventory).map((tool) => ({ ...tool, showOwned: true, isMissing: !tool.owned }));
}

function requirementRows(recipe, inventory) {
  if (!inventory) {
    return (recipe.requirements ?? []).map((requirement) => ({ ...requirement, showOwned: false, isMissing: false }));
  }
  const status = requirementStatus(recipe, inventory);
  return status.requirements.map((requirement) => ({ ...requirement, showOwned: true, isMissing: !status.met }));
}

function readiness(recipe, inventory) {
  if (!recipe.result) {
    return { ready: false, blocked: t("SODLTRADE.Crafting.NoResult") };
  }
  try {
    planCraft(recipe, inventory);
  } catch (err) {
    return { ready: false, blocked: errorMessage(err) };
  }
  return { ready: true, blocked: "" };
}

function knownChips(recipe, characters) {
  return characters.map((actor) => ({ id: actor.id, name: actor.name, known: recipe.knownBy.includes(actor.id) }));
}

function recipeView(recipe, { inventory, characters, collapsed }) {
  let result = null;
  if (recipe.result) {
    result = { ...recipe.result, isBundle: recipe.result.quantity > 1 };
  }
  let status = { ready: false, blocked: "" };
  if (inventory) {
    status = readiness(recipe, inventory);
  }
  return {
    id: recipe.id,
    name: recipe.name || t("SODLTRADE.Crafting.Unnamed"),
    rawName: recipe.name,
    collapsed: collapsed.has(recipe.id),
    result,
    ingredients: ingredientRows(recipe, inventory),
    tools: toolRows(recipe, inventory),
    requirements: requirementRows(recipe, inventory),
    costText: costText(recipe.cost),
    time: recipe.time,
    checkText: checkText(recipe.check),
    boons: recipe.check.boons,
    attributes: CRAFT_ATTRIBUTES.map((attribute) => ({ attribute, label: attributeLabel(attribute), selected: attribute === recipe.check.attribute })),
    known: knownChips(recipe, characters),
    knownNames: characters.filter((actor) => recipe.knownBy.includes(actor.id)).map((actor) => actor.name).join(", "),
    ...status
  };
}

const GM_STEPS = ["Resources", "Defaults", "Create", "Result", "Ingredients", "Tools", "Requirements", "Roll", "Teach", "Done"];
const PLAYER_STEPS = ["Character", "Read", "Craft"];

// The guide is open while nothing is set up yet, then stays as the user left it.
function helpView(app, isGM, isEmpty) {
  let open = isEmpty;
  if (app.craftingHelpOpen !== null) {
    open = app.craftingHelpOpen;
  }
  if (isGM) {
    return { open, steps: GM_STEPS.map((step) => t(`SODLTRADE.Crafting.Help.Gm.${step}`)), example: t("SODLTRADE.Crafting.Help.Gm.Example") };
  }
  let approval = "Immediate";
  if (game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING)) {
    approval = "Approval";
  }
  const steps = [...PLAYER_STEPS, approval].map((step) => t(`SODLTRADE.Crafting.Help.Player.${step}`));
  return { open, steps, example: "" };
}

function orderView(order) {
  const actor = game.actors.get(order.actorId);
  return { id: order.id, name: order.name, img: order.img, crafter: actor?.name ?? "", crafterImg: actor?.img ?? "" };
}

function visibleOrders(isGM) {
  const orders = readCrafting().orders ?? [];
  if (isGM) {
    return orders;
  }
  const mine = ownedCharacterIds();
  return orders.filter((order) => mine.includes(order.actorId));
}

function toEntry(item) {
  return {
    id: foundry.utils.randomID(),
    sourceUuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type,
    quantity: item.system?.quantity,
    value: item.system?.value
  };
}

async function droppedItem(event) {
  event.preventDefault();
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
  if (data?.type !== "Item") {
    return null;
  }
  return fromUuid(data.uuid);
}

function bindDrop(zone, onItem) {
  zone.addEventListener("dragover", (event) => event.preventDefault());
  zone.addEventListener("drop", async (event) => {
    try {
      const item = await droppedItem(event);
      if (item) {
        onItem(item);
      }
    } catch (err) {
      ui.notifications.warn(errorMessage(err));
    }
  });
}

function bindChange(panel, attribute, onChange) {
  for (const input of panel.querySelectorAll(`[${attribute}]`)) {
    input.addEventListener("change", () => onChange(input.getAttribute(attribute), input));
  }
}

export const craftingPanel = {
  id: "crafting",
  template: modulePath("src/apps/panels/crafting-panel.html"),

  enabled() {
    return isFeatureEnabled("crafting");
  },

  // Players only see the tab once the GM has taught one of their characters a recipe.
  isOpen() {
    const crafting = readCrafting();
    return ownedCharacterIds().some((actorId) => knownRecipes(crafting, actorId).length > 0);
  },

  badge() {
    if (!game.user.isGM) {
      return 0;
    }
    return (readCrafting().orders ?? []).length;
  },

  prepare(app, base) {
    const crafting = readCrafting();
    const editing = base.isGM && app.craftingEditing;
    let recipes = crafting.recipes;
    let inventory = null;
    if (!base.isGM) {
      recipes = knownRecipes(crafting, app.actingId);
      const actor = game.actors.get(app.actingId);
      if (actor) {
        inventory = toCraftingInventory(actor);
      }
    }
    const options = { inventory, characters: base.characters, collapsed: app.collapsedRecipes };
    return {
      editing,
      help: helpView(app, base.isGM, recipes.length === 0),
      recipes: recipes.map((recipe) => recipeView(recipe, options)),
      isEmpty: recipes.length === 0,
      requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING),
      orders: visibleOrders(base.isGM).map(orderView)
    };
  },

  bind(app) {
    const panel = app.element.querySelector("[data-panel=crafting]");
    panel.querySelector("[data-craft-help]")?.addEventListener("toggle", (event) => {
      app.craftingHelpOpen = event.target.open;
    });
    if (!game.user.isGM || !app.craftingEditing) {
      return;
    }
    for (const zone of panel.querySelectorAll("[data-craft-result-drop]")) {
      bindDrop(zone, (item) => sendCrafting({ type: "setResult", recipeId: zone.dataset.craftResultDrop, entry: toEntry(item) }));
    }
    for (const zone of panel.querySelectorAll("[data-craft-ingredient-drop]")) {
      bindDrop(zone, (item) => sendCrafting({ type: "addIngredients", recipeId: zone.dataset.craftIngredientDrop, entries: [toEntry(item)] }));
    }
    for (const zone of panel.querySelectorAll("[data-craft-requirement-drop]")) {
      bindDrop(zone, (item) => sendCrafting({ type: "addRequirements", recipeId: zone.dataset.craftRequirementDrop, entries: [toEntry(item)] }));
    }
    for (const zone of panel.querySelectorAll("[data-craft-tool-drop]")) {
      bindDrop(zone, (item) => sendCrafting({ type: "addTools", recipeId: zone.dataset.craftToolDrop, entries: [toEntry(item)] }));
    }
    bindChange(panel, "data-craft-name", (recipeId, input) => sendCrafting({ type: "renameRecipe", recipeId, name: input.value }));
    bindChange(panel, "data-craft-result-quantity", (recipeId, input) => sendCrafting({ type: "setResultQuantity", recipeId, quantity: input.value }));
    bindChange(panel, "data-craft-cost", (recipeId, input) => sendCrafting({ type: "setCost", recipeId, text: input.value }));
    bindChange(panel, "data-craft-time", (recipeId, input) => sendCrafting({ type: "setTime", recipeId, text: input.value }));
    bindChange(panel, "data-craft-ingredient-quantity", (key, input) => {
      const [recipeId, ingredientId] = key.split("/");
      sendCrafting({ type: "setIngredientQuantity", recipeId, ingredientId, quantity: input.value });
    });
    // The attribute and its boons are saved together, whichever of the two fields changed.
    const saveCheck = (recipeId) => {
      const attribute = panel.querySelector(`[data-craft-attribute="${recipeId}"]`).value;
      const boons = panel.querySelector(`[data-craft-boons="${recipeId}"]`).value;
      sendCrafting({ type: "setCheck", recipeId, attribute, boons });
    };
    bindChange(panel, "data-craft-attribute", saveCheck);
    bindChange(panel, "data-craft-boons", saveCheck);
  },

  actions: {
    async craftImportResources(event, target) {
      target.disabled = true;
      try {
        await importResources();
      } catch (err) {
        console.error(`${MODULE_ID} | Resource import failed`, err);
        ui.notifications.error(t("SODLTRADE.Errors.ResourcesFailed"));
      } finally {
        target.disabled = false;
      }
    },
    async craftImportRecipes(event, target) {
      target.disabled = true;
      try {
        await importDefaultRecipes();
      } catch (err) {
        console.error(`${MODULE_ID} | Recipe import failed`, err);
        ui.notifications.error(t("SODLTRADE.Errors.RecipesFailed"));
      } finally {
        target.disabled = false;
      }
    },
    craftToggleEdit() {
      this.craftingEditing = !this.craftingEditing;
      this.render();
    },
    craftToggleRecipe(event, target) {
      const recipeId = target.dataset.recipeId;
      if (this.collapsedRecipes.has(recipeId)) {
        this.collapsedRecipes.delete(recipeId);
      } else {
        this.collapsedRecipes.add(recipeId);
      }
      this.render();
    },
    craftAddRecipe() {
      const input = this.element.querySelector("[name=newRecipe]");
      sendCrafting({ type: "addRecipe", id: foundry.utils.randomID(), name: input.value });
    },
    craftRemoveRecipe(event, target) {
      sendCrafting({ type: "removeRecipe", recipeId: target.dataset.recipeId });
    },
    craftRemoveIngredient(event, target) {
      sendCrafting({ type: "removeIngredient", recipeId: target.dataset.recipeId, ingredientId: target.dataset.ingredientId });
    },
    craftAddRequirement(event, target) {
      const recipeId = target.dataset.recipeId;
      const input = this.element.querySelector(`[data-requirement-input="${recipeId}"]`);
      sendCrafting({ type: "addRequirements", recipeId, entries: [{ id: foundry.utils.randomID(), sourceUuid: null, name: input.value, img: "", type: "text" }] });
    },
    craftRemoveRequirement(event, target) {
      sendCrafting({ type: "removeRequirement", recipeId: target.dataset.recipeId, requirementId: target.dataset.requirementId });
    },
    craftRemoveTool(event, target) {
      sendCrafting({ type: "removeTool", recipeId: target.dataset.recipeId, toolId: target.dataset.toolId });
    },
    craftToggleKnown(event, target) {
      sendCrafting({ type: "toggleKnown", recipeId: target.dataset.recipeId, actorId: target.dataset.actorId });
    },
    craftMake(event, target) {
      sendCrafting({ type: "craft", recipeId: target.dataset.recipeId, actorId: this.actingId, orderId: foundry.utils.randomID() });
    },
    craftApproveOrder(event, target) {
      sendCrafting({ type: "approveOrder", orderId: target.dataset.orderId });
    },
    craftRejectOrder(event, target) {
      sendCrafting({ type: "rejectOrder", orderId: target.dataset.orderId });
    },
    craftCancelOrder(event, target) {
      sendCrafting({ type: "cancelOrder", orderId: target.dataset.orderId });
    }
  }
};
