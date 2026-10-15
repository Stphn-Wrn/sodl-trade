import { TradeHub } from "./apps/trade-hub.js";
import { playBrew } from "./apps/panels/brew-animation.js";
import { stationSvg } from "./apps/panels/stations.js";
import { CRAFT_APPROVAL_SETTING, MODULE_ID } from "./shared/constants.js";
import { extensions } from "./shared/extensions.js";
import { needsApproval } from "./shared/features.js";
import { isPlayerCharacter, ownsActor } from "./shared/foundry-adapter.js";
import { LocalizedError } from "./shared/i18n.js";
import { sendRequest } from "./socket.js";
import { rollChallenge } from "./trade/challenge-roll.js";
import { postCraftingChat } from "./trade/chat-log.js";
import { matchesIngredient } from "./trade/craft-plan.js";
import { readCrafting } from "./trade/crafting-store.js";
import { toResourceInventory } from "./trade/inventory.js";
import { loadResourceCatalog } from "./trade/resource-store.js";
import { localizedName } from "./trade/resources.js";
import { executeCraft } from "./trade/trade-executor.js";

// What other modules may use, published as game.modules.get("sodl-trade").api.
// It is the only door into this module: files may move, this stays.
export function createApi({ onFeatureToggled }) {
  return {
    version: 1,

    // Adding to the module: a tab in the window, a kind of request, a way to discover recipes.
    registerPanel: (panel, options) => extensions.registerPanel(panel, options),
    registerRequest: (type, descriptor) => extensions.registerRequest(type, descriptor),
    registerRecipeDiscovery: (name, rule) => extensions.registerRecipeDiscovery(name, rule),

    // The window and the requests it sends.
    sendRequest,
    refresh: () => TradeHub.refreshAll(),
    openHub: (tab) => TradeHub.open(tab),
    onFeatureToggled,
    requiresApproval: (request) => needsApproval(request, { isGM: game.user.isGM, requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING) }),

    // Characters, their items, and what crafting changes on them.
    isPlayerCharacter,
    ownsActor,
    toResourceInventory,
    executeCraft,
    rollChallenge,

    // Recipes and the resource catalog.
    readCrafting,
    matchesIngredient,
    loadResourceCatalog,
    localizedName,

    // Presentation shared with the crafting tab.
    playBrew,
    stationSvg,
    postCraftingChat,
    LocalizedError
  };
}
