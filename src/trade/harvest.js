import { LocalizedError } from "../shared/i18n.js";
import { TRADABLE_TYPES } from "./inventory.js";
import { localizedName } from "./resources.js";

// Attributes a harvest can ask to roll: finding things is mostly Perception, knowing what to pick is Intellect.
export const HARVEST_ATTRIBUTES = ["perception", "intellect", "agility", "strength", "will"];

// The world is dying: every chance of finding something is multiplied by its state.
export const SCARCITY_LEVELS = { preserved: 1, dying: 0.5, devastated: 0.25 };

// Rarities of the catalog, turned into chances when the map is first built.
const RARITY_WEIGHTS = { C: 10, U: 4, R: 1, E: 0.25 };

const CHALLENGE_TARGET = 10;
const CRITICAL_TARGET = 20;
const DICE = /^(\d+)d(\d+)$/;
const NEW_ENTRY_CHANCE = 1;

export function emptyHarvest() {
  return { site: null, map: null };
}

function roundDown(chance) {
  return Math.floor(chance * 10) / 10;
}

function seedEntries(catalog, biome, lang) {
  const found = catalog.folders
    .flatMap((folder) => folder.items)
    .filter((resource) => RARITY_WEIGHTS[resource.harvest?.biomes?.[biome]]);
  const total = found.reduce((sum, resource) => sum + RARITY_WEIGHTS[resource.harvest.biomes[biome]], 0);
  return found.map((resource) => ({
    id: resource.key,
    resourceKey: resource.key,
    sourceUuid: null,
    name: localizedName(resource.name, lang),
    img: resource.img,
    chance: roundDown((RARITY_WEIGHTS[resource.harvest.biomes[biome]] / total) * 100),
    quantity: resource.harvest.quantity
  }));
}

// The shipped catalog is only a starting point: once built, the map belongs to the world and the GM edits it.
// Chances are set for an untouched world; the state of the world then scales them down.
export function seedHarvestMap(catalog, lang) {
  return {
    realms: catalog.realms.map((realm) => ({ id: realm.key, name: localizedName(realm.name, lang) })),
    biomes: catalog.biomes.map((biome) => ({
      id: biome.key,
      realm: biome.realm,
      name: localizedName(biome.name, lang),
      description: localizedName(biome.description, lang),
      entries: seedEntries(catalog, biome.key, lang)
    }))
  };
}

export function totalChance(biome) {
  return Math.round(biome.entries.reduce((sum, entry) => sum + entry.chance, 0) * 10) / 10;
}

// "1d3", "2d4" or a plain number; random() returns a number in [0, 1).
export function rollQuantity(formula, random) {
  const match = DICE.exec(String(formula).trim());
  if (!match) {
    return Math.max(1, Math.trunc(Number(formula)) || 1);
  }
  let total = 0;
  for (let die = 0; die < Number(match[1]); die += 1) {
    total += Math.floor(random() * Number(match[2])) + 1;
  }
  return total;
}

export function drawHarvest(entries, scarcity, random) {
  const factor = SCARCITY_LEVELS[scarcity] ?? SCARCITY_LEVELS.dying;
  let roll = random() * 100;
  for (const entry of entries) {
    const chance = entry.chance * factor;
    if (roll < chance) {
      return { entry, quantity: rollQuantity(entry.quantity, random) };
    }
    roll -= chance;
  }
  return null;
}

// A failed roll finds nothing, a success searches once, and 20 or more searches twice.
export function drawCount(total) {
  if (total >= CRITICAL_TARGET) {
    return 2;
  }
  if (total >= CHALLENGE_TARGET) {
    return 1;
  }
  return 0;
}

function toBoons(value) {
  const boons = Math.trunc(Number(value));
  if (!Number.isFinite(boons)) {
    return 0;
  }
  return boons;
}

function toChance(value) {
  const chance = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(chance) || chance < 0 || chance > 100) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidChance");
  }
  return roundDown(chance);
}

function toDice(value) {
  const formula = String(value ?? "").trim();
  const match = DICE.exec(formula);
  if (match && Number(match[1]) >= 1 && Number(match[2]) >= 1) {
    return formula;
  }
  if (/^\d+$/.test(formula) && Number(formula) >= 1) {
    return formula;
  }
  throw new LocalizedError("SODLTRADE.Errors.InvalidDice");
}

function cleanText(text) {
  return String(text ?? "").trim();
}

function result(harvest, attempt = null, event = null) {
  return { harvest, attempt, event };
}

function findBiome(harvest, biomeId) {
  const biome = harvest.map.biomes.find((entry) => entry.id === biomeId);
  if (!biome) {
    throw new LocalizedError("SODLTRADE.Errors.BiomeGone");
  }
  return biome;
}

function withMap(harvest, change) {
  return { ...harvest, map: { ...harvest.map, ...change } };
}

function updateBiomeWith(harvest, biomeId, change) {
  findBiome(harvest, biomeId);
  return withMap(harvest, { biomes: harvest.map.biomes.map((biome) => {
    if (biome.id === biomeId) {
      return change(biome);
    }
    return biome;
  }) });
}

function updateEntry(harvest, biomeId, entryId, change) {
  return updateBiomeWith(harvest, biomeId, (biome) => {
    if (!biome.entries.some((entry) => entry.id === entryId)) {
      throw new LocalizedError("SODLTRADE.Errors.EntryGone");
    }
    const next = { ...biome, entries: biome.entries.map((entry) => {
      if (entry.id === entryId) {
        return change(entry);
      }
      return entry;
    }) };
    if (totalChance(next) > 100) {
      throw new LocalizedError("SODLTRADE.Errors.ChanceOver100", { name: biome.name });
    }
    return next;
  });
}

function addRealm(harvest, { id, name }) {
  return result(withMap(harvest, { realms: [...harvest.map.realms, { id, name: cleanText(name) }] }));
}

function renameRealm(harvest, { realmId, name }) {
  return result(withMap(harvest, { realms: harvest.map.realms.map((realm) => {
    if (realm.id === realmId) {
      return { ...realm, name: cleanText(name) };
    }
    return realm;
  }) }));
}

function removeRealm(harvest, { realmId }) {
  if (harvest.map.biomes.some((biome) => biome.realm === realmId)) {
    throw new LocalizedError("SODLTRADE.Errors.RealmNotEmpty");
  }
  return result(withMap(harvest, { realms: harvest.map.realms.filter((realm) => realm.id !== realmId) }));
}

function addBiome(harvest, { id, realm, name }) {
  return result(withMap(harvest, { biomes: [...harvest.map.biomes, { id, realm, name: cleanText(name), description: "", entries: [] }] }));
}

function updateBiome(harvest, { biomeId, name, description, realm }) {
  return result(updateBiomeWith(harvest, biomeId, (biome) => {
    const next = { ...biome };
    if (name !== undefined) {
      next.name = cleanText(name);
    }
    if (description !== undefined) {
      next.description = cleanText(description);
    }
    if (realm !== undefined) {
      next.realm = realm;
    }
    return next;
  }));
}

// The harvest open in a deleted biome would have nothing left to find, so it closes.
function removeBiome(harvest, { biomeId }) {
  findBiome(harvest, biomeId);
  let site = harvest.site;
  if (site?.biome === biomeId) {
    site = null;
  }
  return result({ ...withMap(harvest, { biomes: harvest.map.biomes.filter((biome) => biome.id !== biomeId) }), site });
}

function isSameEntry(first, second) {
  if (first.resourceKey && first.resourceKey === second.resourceKey) {
    return true;
  }
  return Boolean(first.sourceUuid) && first.sourceUuid === second.sourceUuid;
}

// A new line starts at 1 %, or whatever is left below 100 %, for the GM to adjust.
function addEntries(harvest, { biomeId, entries }) {
  return result(updateBiomeWith(harvest, biomeId, (biome) => {
    const added = [];
    for (const entry of entries) {
      const known = [...biome.entries, ...added].some((existing) => isSameEntry(existing, entry));
      if (TRADABLE_TYPES.includes(entry.type) && !known) {
        const room = Math.max(0, 100 - totalChance({ entries: [...biome.entries, ...added] }));
        added.push({ id: entry.id, resourceKey: entry.resourceKey, sourceUuid: entry.sourceUuid, name: entry.name, img: entry.img, chance: roundDown(Math.min(NEW_ENTRY_CHANCE, room)), quantity: "1" });
      }
    }
    if (added.length === 0) {
      throw new LocalizedError("SODLTRADE.Errors.NothingImported");
    }
    return { ...biome, entries: [...biome.entries, ...added] };
  }));
}

function setEntryChance(harvest, { biomeId, entryId, chance }) {
  const value = toChance(chance);
  return result(updateEntry(harvest, biomeId, entryId, (entry) => ({ ...entry, chance: value })));
}

function setEntryQuantity(harvest, { biomeId, entryId, quantity }) {
  const value = toDice(quantity);
  return result(updateEntry(harvest, biomeId, entryId, (entry) => ({ ...entry, quantity: value })));
}

function removeEntry(harvest, { biomeId, entryId }) {
  return result(updateBiomeWith(harvest, biomeId, (biome) => ({ ...biome, entries: biome.entries.filter((entry) => entry.id !== entryId) })));
}

function reset(harvest, { map }) {
  return result({ site: null, map });
}

function openSite(harvest, { biome, attribute, boons }) {
  findBiome(harvest, biome);
  if (!HARVEST_ATTRIBUTES.includes(attribute)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidAttribute");
  }
  return result({ ...harvest, site: { biome, attribute, boons: toBoons(boons), harvestedBy: [] } }, null, "opened");
}

function closeSite(harvest) {
  return result({ ...harvest, site: null });
}

function openedSite(harvest) {
  if (!harvest.site) {
    throw new LocalizedError("SODLTRADE.Errors.HarvestClosed");
  }
  return harvest.site;
}

function renewSite(harvest) {
  const site = openedSite(harvest);
  return result({ ...harvest, site: { ...site, harvestedBy: [] } }, null, "renewed");
}

function harvestOnce(harvest, { actorId }) {
  const site = openedSite(harvest);
  if (site.harvestedBy.includes(actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.AlreadyHarvested");
  }
  const biome = findBiome(harvest, site.biome);
  const attempt = { actorId, biome: site.biome, entries: biome.entries, check: { attribute: site.attribute, boons: site.boons } };
  return result({ ...harvest, site: { ...site, harvestedBy: [...site.harvestedBy, actorId] } }, attempt);
}

const GM = "gm";
const OWNER = "owner";

const ACTIONS = {
  addRealm: { role: GM, run: addRealm },
  renameRealm: { role: GM, run: renameRealm },
  removeRealm: { role: GM, run: removeRealm },
  addBiome: { role: GM, run: addBiome },
  updateBiome: { role: GM, run: updateBiome },
  removeBiome: { role: GM, run: removeBiome },
  addEntries: { role: GM, run: addEntries },
  setEntryChance: { role: GM, run: setEntryChance },
  setEntryQuantity: { role: GM, run: setEntryQuantity },
  removeEntry: { role: GM, run: removeEntry },
  reset: { role: GM, run: reset },
  open: { role: GM, run: openSite },
  close: { role: GM, run: closeSite },
  renew: { role: GM, run: renewSite },
  harvest: { role: OWNER, run: harvestOnce }
};

export function applyHarvestAction(harvest, action, context) {
  const strategy = ACTIONS[action.type];
  if (!strategy) {
    throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
  }
  if (strategy.role === GM && !context.isGM) {
    throw new LocalizedError("SODLTRADE.Errors.NotAllowed");
  }
  if (strategy.role === OWNER && !context.isGM && !context.ownsActor(action.actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return strategy.run(harvest, action, context);
}
