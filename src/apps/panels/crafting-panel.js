import { CRAFT_APPROVAL_SETTING, MODULE_ID, SEEN_RECIPES_SETTING, modulePath } from "../../shared/constants.js";
import { errorMessage, isFeatureEnabled, ownedCharacterIds, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { playBrew } from "./brew-animation.js";
import { stationSvg } from "./stations.js";
import { ingredientStatus, planCraft, requirementStatus, toolStatus } from "../../trade/craft-plan.js";
import { hasRecipeReference } from "../../trade/potion-spells.js";
import { CRAFT_ATTRIBUTES, STATIONS, knownRecipes, recipeStation } from "../../trade/crafting.js";
import { readCrafting } from "../../trade/crafting-store.js";
import { ALL_STATIONS, matchRecipe, unseenRecipeIds } from "../../trade/recipe-filter.js";
import { importDefaultRecipes } from "../../trade/recipe-import.js";
import { importResources } from "../../trade/resource-store.js";
import { toCraftingInventory } from "../../trade/inventory.js";
import { describeOffer } from "../../trade/trade-view.js";

const STATION_ICONS = { cauldron: "fa-flask", forge: "fa-hammer", workbench: "fa-toolbox" };

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

function stationLabel(station) {
  return t(`SODLTRADE.Crafting.Stations.${station}`);
}

function recipeView(recipe, { inventory, characters, editingId }) {
  let result = null;
  if (recipe.result) {
    result = { ...recipe.result, isBundle: recipe.result.quantity > 1 };
  }
  let status = { ready: false, blocked: "" };
  if (inventory) {
    status = readiness(recipe, inventory);
  }
  const station = recipeStation(recipe);
  const name = recipe.name || t("SODLTRADE.Crafting.Unnamed");
  // A brewmaster with Recipe Reference brews potions in half the time.
  const halfTime = Boolean(inventory) && station === "cauldron" && hasRecipeReference(inventory);
  // The recipe the GM is editing shows its form instead of its workbench, so it needs no drawing.
  const editing = recipe.id === editingId;
  let art = "";
  if (!editing) {
    art = stationSvg(station, `sodl-craft-${recipe.id}`);
  }
  return {
    id: recipe.id,
    name,
    searchName: `${name} ${recipe.result?.name ?? ""}`,
    // Tools count too, so searching "alchimiste" lists everything made with the alchemist's kit.
    ingredientNames: [...recipe.ingredients, ...(recipe.tools ?? [])].map((entry) => entry.name).join("|"),
    station,
    stationIcon: STATION_ICONS[station],
    stationLabel: stationLabel(station),
    stations: STATIONS.map((entry) => ({ station: entry, label: stationLabel(entry), selected: entry === station })),
    art,
    rawName: recipe.name,
    editing,
    result,
    ingredients: ingredientRows(recipe, inventory),
    tools: toolRows(recipe, inventory),
    requirements: requirementRows(recipe, inventory),
    costText: costText(recipe.cost),
    time: recipe.time,
    halfTime,
    checkText: checkText(recipe.check),
    boons: recipe.check.boons,
    attributes: CRAFT_ATTRIBUTES.map((attribute) => ({ attribute, label: attributeLabel(attribute), selected: attribute === recipe.check.attribute })),
    known: knownChips(recipe, characters),
    knownNames: characters.filter((actor) => recipe.knownBy.includes(actor.id)).map((actor) => actor.name).join(", "),
    ...status,
    // Browsing without a character, the fire burns anyway so the GM sees the workshop alive.
    lit: status.ready || !inventory
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

// The recipe on the workbench stays put once picked; otherwise the first one that can be made.
function selectedRecipeId(recipes, wanted) {
  if (recipes.some((recipe) => recipe.id === wanted)) {
    return wanted;
  }
  const ready = recipes.find((recipe) => recipe.ready);
  if (ready) {
    return ready.id;
  }
  return recipes[0]?.id ?? null;
}

function orderView(order) {
  const actor = game.actors.get(order.actorId);
  return { id: order.id, name: order.name, img: order.img, crafter: actor?.name ?? "", crafterImg: actor?.img ?? "" };
}

function visibleOrders(isGM, ownIds) {
  const orders = readCrafting().orders ?? [];
  if (isGM) {
    return orders;
  }
  return orders.filter((order) => ownIds.includes(order.actorId));
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

function stationFilterView(station, active) {
  if (station === ALL_STATIONS) {
    return { station, label: t("SODLTRADE.Crafting.Stations.all"), icon: "fa-border-all", showLabel: true, active: active === station };
  }
  return { station, label: stationLabel(station), icon: STATION_ICONS[station], showLabel: false, active: active === station };
}

function entryRecipe(entry) {
  return {
    name: entry.dataset.name,
    ingredients: entry.dataset.ingredients.split("|").filter(Boolean),
    station: entry.dataset.station,
    ready: entry.dataset.ready === "1"
  };
}

function seenRecipes() {
  return game.settings.get(MODULE_ID, SEEN_RECIPES_SETTING) ?? {};
}

// Opening a recipe takes its "New" mark off; the first visit records what is already known.
function markSeen(actorId, recipeIds) {
  const seen = seenRecipes();
  const before = seen[actorId] ?? [];
  const after = [...new Set([...before, ...recipeIds])];
  if (seen[actorId] && after.length === before.length) {
    return;
  }
  game.settings.set(MODULE_ID, SEEN_RECIPES_SETTING, { ...seen, [actorId]: after });
}

// The list is split by station; a station whose recipes are all filtered out hides its header too.
function stationGroups(views) {
  return STATIONS
    .map((station) => ({ station, label: stationLabel(station), recipes: views.filter((view) => view.station === station) }))
    .filter((group) => group.recipes.length > 0);
}

function applyFilter(panel, filter) {
  let shown = 0;
  for (const entry of panel.querySelectorAll("[data-craft-entry]")) {
    const { visible, via } = matchRecipe(entryRecipe(entry), filter);
    entry.hidden = !visible;
    const viaLabel = entry.querySelector("[data-craft-via]");
    viaLabel.hidden = !via;
    if (via) {
      viaLabel.textContent = t("SODLTRADE.Crafting.Via", { name: via });
    }
    if (visible) {
      shown += 1;
    }
  }
  for (const group of panel.querySelectorAll("[data-craft-group]")) {
    group.hidden = ![...group.querySelectorAll("[data-craft-entry]")].some((entry) => !entry.hidden);
  }
  const noMatch = panel.querySelector("[data-craft-no-match]");
  if (noMatch) {
    noMatch.hidden = shown > 0;
  }
}

// Picking a recipe or filtering the list only shows and hides what is already drawn:
// nothing is rendered again, so the window does not flicker or lose its scroll.
function selectRecipe(panel, recipeId) {
  for (const button of panel.querySelectorAll("[data-craft-select]")) {
    button.classList.toggle("is-selected", button.dataset.craftSelect === recipeId);
  }
  for (const bench of panel.querySelectorAll("[data-craft-bench]")) {
    bench.hidden = bench.dataset.craftBench !== recipeId;
  }
}

function bindWorkshop(app, panel) {
  applyFilter(panel, app.craftingFilter);
  for (const button of panel.querySelectorAll("[data-craft-select]")) {
    button.addEventListener("click", () => {
      app.selectedRecipeId = button.dataset.craftSelect;
      selectRecipe(panel, app.selectedRecipeId);
      if (app.actingId && !game.user.isGM) {
        button.querySelector("[data-craft-new]")?.remove();
        markSeen(app.actingId, [app.selectedRecipeId]);
      }
    });
  }
  const search = panel.querySelector("[data-craft-search]");
  search?.addEventListener("input", () => {
    app.craftingFilter = { ...app.craftingFilter, text: search.value };
    applyFilter(panel, app.craftingFilter);
  });
  // Clicking an ingredient on a workbench lists every recipe that uses it.
  for (const slot of panel.querySelectorAll("[data-craft-find]")) {
    slot.addEventListener("click", () => {
      search.value = slot.dataset.craftFind;
      app.craftingFilter = { ...app.craftingFilter, text: search.value, station: ALL_STATIONS, readyOnly: false };
      for (const button of panel.querySelectorAll("[data-craft-station-filter]")) {
        button.classList.toggle("is-active", button.dataset.craftStationFilter === ALL_STATIONS);
      }
      const readyOnly = panel.querySelector("[data-craft-ready-only]");
      if (readyOnly) {
        readyOnly.checked = false;
      }
      applyFilter(panel, app.craftingFilter);
      search.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }
  panel.querySelector("[data-craft-ready-only]")?.addEventListener("change", (event) => {
    app.craftingFilter = { ...app.craftingFilter, readyOnly: event.target.checked };
    applyFilter(panel, app.craftingFilter);
  });
  for (const button of panel.querySelectorAll("[data-craft-station-filter]")) {
    button.addEventListener("click", () => {
      app.craftingFilter = { ...app.craftingFilter, station: button.dataset.craftStationFilter };
      for (const other of panel.querySelectorAll("[data-craft-station-filter]")) {
        other.classList.toggle("is-active", other === button);
      }
      applyFilter(panel, app.craftingFilter);
    });
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
    let editingId = null;
    if (base.isGM) {
      editingId = app.craftingEditingId;
    }
    let recipes = crafting.recipes;
    let inventory = null;
    if (!base.isGM) {
      recipes = knownRecipes(crafting, app.actingId);
      const actor = game.actors.get(app.actingId);
      if (actor) {
        inventory = toCraftingInventory(actor);
      }
    }
    const options = { inventory, characters: base.characters, editingId };
    const views = recipes.map((recipe) => recipeView(recipe, options));
    app.selectedRecipeId = selectedRecipeId(views, app.selectedRecipeId);
    // Players see which recipes they learned since they last looked; the GM has nothing to discover.
    let unseen = [];
    if (!base.isGM && inventory) {
      unseen = unseenRecipeIds(views.map((view) => view.id), seenRecipes()[app.actingId] ?? null);
    }
    for (const view of views) {
      view.selected = view.id === app.selectedRecipeId;
      view.isNew = unseen.includes(view.id);
    }
    return {
      help: helpView(app, base.isGM, recipes.length === 0),
      recipes: views,
      groups: stationGroups(views),
      filter: app.craftingFilter,
      stationFilters: [ALL_STATIONS, ...STATIONS].map((station) => stationFilterView(station, app.craftingFilter.station)),
      isEmpty: recipes.length === 0,
      requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING),
      orders: visibleOrders(base.isGM, base.ownIds).map(orderView)
    };
  },

  bind(app) {
    const panel = app.element.querySelector("[data-panel=crafting]");
    bindWorkshop(app, panel);
    if (!game.user.isGM) {
      // The first time a character's list is shown, what they already know is not news.
      if (app.actingId && !seenRecipes()[app.actingId]) {
        markSeen(app.actingId, knownRecipes(readCrafting(), app.actingId).map((recipe) => recipe.id));
      }
      return;
    }
    bindChange(panel, "data-craft-station-select", (recipeId, input) => sendCrafting({ type: "setStation", recipeId, station: input.value }));
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
    craftToggleHelp(event, target) {
      this.craftingHelpOpen = target.getAttribute("aria-expanded") !== "true";
      this.render();
    },
    craftEditRecipe(event, target) {
      this.selectedRecipeId = target.dataset.recipeId;
      this.craftingEditingId = target.dataset.recipeId;
      this.render();
    },
    craftDoneEditing() {
      this.craftingEditingId = null;
      this.render();
    },
    // The new recipe opens straight in its form; the window renders when the GM's save comes back.
    craftAddRecipe() {
      const id = foundry.utils.randomID();
      this.selectedRecipeId = id;
      this.craftingEditingId = id;
      this.craftingFilter = { text: "", station: "all", readyOnly: false };
      sendCrafting({ type: "addRecipe", id, name: "" });
    },
    async craftRemoveRecipe(event, target) {
      const recipeId = target.dataset.recipeId;
      const recipe = readCrafting().recipes.find((entry) => entry.id === recipeId);
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: t("SODLTRADE.Crafting.RemoveRecipe") },
        content: `<p>${t("SODLTRADE.Crafting.ConfirmRemove", { name: recipe?.name || t("SODLTRADE.Crafting.Unnamed") })}</p>`
      });
      if (!confirmed) {
        return;
      }
      this.craftingEditingId = null;
      sendCrafting({ type: "removeRecipe", recipeId });
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
    async craftMake(event, target) {
      const action = { type: "craft", recipeId: target.dataset.recipeId, actorId: this.actingId, orderId: foundry.utils.randomID() };
      let mode = "immediate";
      if (game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING)) {
        mode = "request";
      }
      target.disabled = true;
      await playBrew(target.closest("[data-craft-bench]"), mode);
      sendCrafting(action);
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
