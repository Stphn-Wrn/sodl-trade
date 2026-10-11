import { HARVEST_SCARCITY_SETTING, MODULE_ID, modulePath } from "../../shared/constants.js";
import { errorMessage, isFeatureEnabled, t } from "../../shared/foundry-adapter.js";
import { sendRequest } from "../../socket.js";
import { HARVEST_ATTRIBUTES, SCARCITY_LEVELS, seedHarvestMap, totalChance } from "../../trade/harvest.js";
import { harvestMap, readHarvest } from "../../trade/harvest-store.js";
import { loadResourceCatalog } from "../../trade/resource-store.js";

const ATTRIBUTE_LABELS = { perception: "DL.AttributePerception", intellect: "DL.AttributeIntellect", agility: "DL.AttributeAgility", strength: "DL.AttributeStrength", will: "DL.AttributeWill" };

function sendHarvest(action) {
  sendRequest("harvest", { action });
}

function percent(value) {
  return `${new Intl.NumberFormat(game.i18n.lang, { maximumFractionDigits: 1 }).format(value)} %`;
}

function scarcity() {
  const level = game.settings.get(MODULE_ID, HARVEST_SCARCITY_SETTING);
  return { factor: SCARCITY_LEVELS[level] ?? SCARCITY_LEVELS.dying, label: t(`SODLTRADE.Settings.HarvestScarcity.${level}`) };
}

function checkText(site) {
  const text = t("SODLTRADE.Crafting.Check", { attribute: t(ATTRIBUTE_LABELS[site.attribute]) });
  if (site.boons > 0) {
    return `${text} (${t("SODLTRADE.Crafting.Boons", { count: site.boons })})`;
  }
  if (site.boons < 0) {
    return `${text} (${t("SODLTRADE.Crafting.Banes", { count: -site.boons })})`;
  }
  return text;
}

// The chances as written by the GM, and what they become in the current state of the world.
function biomeOdds(biome, factor) {
  const total = totalChance(biome);
  return {
    entries: biome.entries.map((entry) => ({ ...entry, chanceText: percent(entry.chance), effectiveText: percent(entry.chance * factor) })),
    totalText: percent(total),
    nothingText: percent(100 - total),
    effectiveNothingText: percent(100 - total * factor)
  };
}

function realmGroups(map, selected) {
  return map.realms.map((realm) => ({
    id: realm.id,
    name: realm.name,
    biomes: map.biomes.filter((biome) => biome.realm === realm.id).map((biome) => ({ id: biome.id, name: biome.name, selected: biome.id === selected }))
  }));
}

function editView(map, app, factor) {
  return map.realms.map((realm) => ({
    id: realm.id,
    name: realm.name,
    isEmpty: !map.biomes.some((biome) => biome.realm === realm.id),
    biomes: map.biomes.filter((biome) => biome.realm === realm.id).map((biome) => ({
      id: biome.id,
      name: biome.name,
      description: biome.description,
      open: app.openBiomes.has(biome.id),
      realms: map.realms.map((option) => ({ id: option.id, name: option.name, selected: option.id === biome.realm })),
      ...biomeOdds(biome, factor)
    }))
  }));
}

function toEntry(item) {
  return {
    id: foundry.utils.randomID(),
    resourceKey: item.getFlag(MODULE_ID, "resource") ?? null,
    sourceUuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type
  };
}

function bindChange(panel, attribute, onChange) {
  for (const input of panel.querySelectorAll(`[${attribute}]`)) {
    input.addEventListener("change", () => onChange(input.getAttribute(attribute), input.value));
  }
}

function bindBiomeDrop(zone) {
  zone.addEventListener("dragover", (event) => event.preventDefault());
  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") {
      return;
    }
    try {
      const item = await fromUuid(data.uuid);
      if (item) {
        sendHarvest({ type: "addEntries", biomeId: zone.dataset.biomeDrop, entries: [toEntry(item)] });
      }
    } catch (err) {
      ui.notifications.warn(errorMessage(err));
    }
  });
}

export const harvestPanel = {
  id: "harvest",
  template: modulePath("src/apps/panels/harvest-panel.html"),

  enabled() {
    return isFeatureEnabled("harvest");
  },

  isOpen() {
    return readHarvest().site !== null;
  },

  async prepare(app, base) {
    const harvest = readHarvest();
    const map = await harvestMap(harvest);
    const world = scarcity();
    const site = harvest.site;
    if (!map.biomes.some((biome) => biome.id === app.harvestBiome)) {
      app.harvestBiome = map.biomes[0]?.id ?? null;
    }
    let shownId = app.harvestBiome;
    let siteView = null;
    if (site) {
      shownId = site.biome;
      const biome = map.biomes.find((entry) => entry.id === site.biome);
      siteView = {
        name: biome?.name ?? "",
        description: biome?.description ?? "",
        checkText: checkText(site),
        alreadyHarvested: site.harvestedBy.includes(app.actingId),
        harvesters: base.characters.map((actor) => ({ name: actor.name, done: site.harvestedBy.includes(actor.id) }))
      };
    }
    const shown = map.biomes.find((biome) => biome.id === shownId);
    let preview = null;
    if (shown) {
      preview = { name: shown.name, description: shown.description, ...biomeOdds(shown, world.factor) };
    }
    return {
      editing: base.isGM && app.harvestEditing,
      site: siteView,
      realms: realmGroups(map, app.harvestBiome),
      edit: editView(map, app, world.factor),
      attributes: HARVEST_ATTRIBUTES.map((attribute) => ({ attribute, label: t(ATTRIBUTE_LABELS[attribute]) })),
      preview,
      hasBiomes: map.biomes.length > 0,
      scarcity: world.label
    };
  },

  bind(app) {
    if (!game.user.isGM) {
      return;
    }
    const panel = app.element.querySelector("[data-panel=harvest]");
    panel.querySelector("[name=harvestBiome]")?.addEventListener("change", (event) => {
      app.harvestBiome = event.target.value;
      app.render();
    });
    if (!app.harvestEditing) {
      return;
    }
    for (const details of panel.querySelectorAll("[data-biome-details]")) {
      details.addEventListener("toggle", () => {
        if (details.open) {
          app.openBiomes.add(details.dataset.biomeDetails);
        } else {
          app.openBiomes.delete(details.dataset.biomeDetails);
        }
      });
    }
    for (const zone of panel.querySelectorAll("[data-biome-drop]")) {
      bindBiomeDrop(zone);
    }
    bindChange(panel, "data-realm-name", (realmId, name) => sendHarvest({ type: "renameRealm", realmId, name }));
    bindChange(panel, "data-biome-name", (biomeId, name) => sendHarvest({ type: "updateBiome", biomeId, name }));
    bindChange(panel, "data-biome-description", (biomeId, description) => sendHarvest({ type: "updateBiome", biomeId, description }));
    bindChange(panel, "data-biome-realm", (biomeId, realm) => sendHarvest({ type: "updateBiome", biomeId, realm }));
    bindChange(panel, "data-entry-chance", (key, chance) => {
      const [biomeId, entryId] = key.split("/");
      sendHarvest({ type: "setEntryChance", biomeId, entryId, chance });
    });
    bindChange(panel, "data-entry-quantity", (key, quantity) => {
      const [biomeId, entryId] = key.split("/");
      sendHarvest({ type: "setEntryQuantity", biomeId, entryId, quantity });
    });
  },

  actions: {
    harvestOpen() {
      const panel = this.element.querySelector("[data-panel=harvest]");
      sendHarvest({
        type: "open",
        biome: panel.querySelector("[name=harvestBiome]").value,
        attribute: panel.querySelector("[name=harvestAttribute]").value,
        boons: panel.querySelector("[name=harvestBoons]").value
      });
    },
    harvestRenew() {
      sendHarvest({ type: "renew" });
    },
    harvestClose() {
      sendHarvest({ type: "close" });
    },
    harvestGather() {
      sendHarvest({ type: "harvest", actorId: this.actingId });
    },
    harvestToggleEdit() {
      this.harvestEditing = !this.harvestEditing;
      this.render();
    },
    harvestAddRealm() {
      const input = this.element.querySelector("[name=newRealm]");
      sendHarvest({ type: "addRealm", id: foundry.utils.randomID(), name: input.value || t("SODLTRADE.Harvest.NewRealm") });
    },
    harvestRemoveRealm(event, target) {
      sendHarvest({ type: "removeRealm", realmId: target.dataset.realmId });
    },
    harvestAddBiome(event, target) {
      const realmId = target.dataset.realmId;
      const input = this.element.querySelector(`[data-new-biome="${realmId}"]`);
      const id = foundry.utils.randomID();
      this.openBiomes.add(id);
      sendHarvest({ type: "addBiome", id, realm: realmId, name: input.value || t("SODLTRADE.Harvest.NewBiome") });
    },
    harvestRemoveBiome(event, target) {
      sendHarvest({ type: "removeBiome", biomeId: target.dataset.biomeId });
    },
    harvestRemoveEntry(event, target) {
      sendHarvest({ type: "removeEntry", biomeId: target.dataset.biomeId, entryId: target.dataset.entryId });
    },
    async harvestReset() {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: t("SODLTRADE.Harvest.Reset") },
        content: `<p>${t("SODLTRADE.Harvest.ResetConfirm")}</p>`
      });
      if (!confirmed) {
        return;
      }
      sendHarvest({ type: "reset", map: seedHarvestMap(await loadResourceCatalog(), game.i18n.lang) });
    }
  }
};
