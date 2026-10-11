import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyHarvestAction, drawCount, drawHarvest, emptyHarvest, rollQuantity, seedHarvestMap, totalChance } from "../../src/trade/harvest.js";

// A fake random source that returns the given numbers in turn.
function sequence(...values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function gm(harvest, action) {
  return applyHarvestAction(harvest, action, { isGM: true, ownsActor: () => false });
}

function player(harvest, action) {
  return applyHarvestAction(harvest, action, { isGM: false, ownsActor: (actorId) => actorId === "a" });
}

function forestMap(entries) {
  return {
    realms: [{ id: "mortal", name: "Monde des mortels" }],
    biomes: [{ id: "forest", realm: "mortal", name: "Forêt", description: "", entries }]
  };
}

function herbs(overrides) {
  return { id: "e1", resourceKey: "herbs", sourceUuid: null, name: "Herbes", img: "h.webp", chance: 30, quantity: "1d3", ...overrides };
}

test("le catalogue devient une carte de mondes et de biomes, avec une chance en % calculée d'après la rareté", () => {
  const catalog = {
    realms: [{ key: "mortal", name: { fr: "Monde des mortels", en: "Mortal world" } }],
    biomes: [{ key: "forest", realm: "mortal", name: { fr: "Forêt", en: "Forest" }, description: { fr: "Des bois.", en: "Woods." } }],
    folders: [{ key: "plants", items: [
      { key: "herbs", name: { fr: "Herbes", en: "Herbs" }, img: "h.webp", harvest: { quantity: "1d3", biomes: { forest: "C" } } },
      { key: "moonpetal", name: { fr: "Pétale de lune", en: "Moonpetal" }, img: "m.webp", harvest: { quantity: "1", biomes: { forest: "R" } } },
      { key: "vial", name: { fr: "Fiole", en: "Vial" }, img: "v.webp" }
    ] }]
  };

  const map = seedHarvestMap(catalog, "fr");

  assert.deepEqual(map, {
    realms: [{ id: "mortal", name: "Monde des mortels" }],
    biomes: [{ id: "forest", realm: "mortal", name: "Forêt", description: "Des bois.", entries: [
      { id: "herbs", resourceKey: "herbs", sourceUuid: null, name: "Herbes", img: "h.webp", chance: 90.9, quantity: "1d3" },
      { id: "moonpetal", resourceKey: "moonpetal", sourceUuid: null, name: "Pétale de lune", img: "m.webp", chance: 9, quantity: "1" }
    ] }]
  });
});

test("une quantité en dés se lance avec la source de hasard, et un nombre seul est fixe", () => {
  assert.equal(rollQuantity("1d3", sequence(0.99)), 3);
  assert.equal(rollQuantity("2d4", sequence(0, 0.5)), 4);
  assert.equal(rollQuantity("2", sequence(0.5)), 2);
});

test("le tirage suit les pourcentages de chaque ligne, et le reste jusqu'à 100 % ne donne rien", () => {
  const entries = [herbs({ chance: 30 }), herbs({ id: "e2", resourceKey: "moonpetal", name: "Pétale", chance: 5, quantity: "1" })];

  assert.deepEqual(drawHarvest(entries, "preserved", sequence(0.29, 0)), { entry: entries[0], quantity: 1 });
  assert.deepEqual(drawHarvest(entries, "preserved", sequence(0.34)), { entry: entries[1], quantity: 1 });
  assert.equal(drawHarvest(entries, "preserved", sequence(0.36)), null);
});

test("l'état du monde multiplie toutes les chances : moitié dans un monde mourant, quart dans un monde dévasté", () => {
  const entries = [herbs({ chance: 40 })];

  assert.notEqual(drawHarvest(entries, "dying", sequence(0.19, 0)), null);
  assert.equal(drawHarvest(entries, "dying", sequence(0.21)), null);
  assert.notEqual(drawHarvest(entries, "devastated", sequence(0.09, 0)), null);
  assert.equal(drawHarvest(entries, "devastated", sequence(0.11)), null);
});

test("un jet raté ne donne aucun tirage, un succès en donne un, et 20 ou plus en donne deux", () => {
  assert.deepEqual([drawCount(9), drawCount(10), drawCount(19), drawCount(20)], [0, 1, 1, 2]);
});

test("le MJ crée un monde et un biome, les renomme, puis les supprime", () => {
  let harvest = { site: null, map: { realms: [], biomes: [] } };
  harvest = gm(harvest, { type: "addRealm", id: "fey", name: " Royaumes cachés " }).harvest;
  harvest = gm(harvest, { type: "addBiome", id: "glade", realm: "fey", name: "Clairière" }).harvest;
  assert.deepEqual(harvest.map.biomes, [{ id: "glade", realm: "fey", name: "Clairière", description: "", entries: [] }]);

  harvest = gm(harvest, { type: "updateBiome", biomeId: "glade", name: "Clairière dorée", description: "Lumineuse." }).harvest;
  assert.deepEqual([harvest.map.biomes[0].name, harvest.map.biomes[0].description], ["Clairière dorée", "Lumineuse."]);

  assert.throws(() => gm(harvest, { type: "removeRealm", realmId: "fey" }), { message: "SODLTRADE.Errors.RealmNotEmpty" });
  harvest = gm(harvest, { type: "removeBiome", biomeId: "glade" }).harvest;
  assert.deepEqual(gm(harvest, { type: "removeRealm", realmId: "fey" }).harvest.map.realms, []);
});

test("le MJ ajoute des objets à un biome avec une chance de départ de 1 %, sans doublon", () => {
  const harvest = { site: null, map: forestMap([herbs({})]) };
  const entries = [
    { id: "e2", resourceKey: null, sourceUuid: "Item.potion", name: "Potion", img: "p.webp", type: "item" },
    { id: "e3", resourceKey: "herbs", sourceUuid: "Item.h", name: "Herbes", img: "h.webp", type: "item" },
    { id: "e4", resourceKey: null, sourceUuid: "Item.fire", name: "Boule de feu", img: "f.webp", type: "spell" }
  ];

  const next = gm(harvest, { type: "addEntries", biomeId: "forest", entries }).harvest;

  assert.deepEqual(next.map.biomes[0].entries.map((entry) => [entry.id, entry.chance, entry.quantity]), [["e1", 30, "1d3"], ["e2", 1, "1"]]);
});

test("le MJ règle la chance et les dés d'une ligne, et le total d'un biome ne peut pas dépasser 100 %", () => {
  const harvest = { site: null, map: forestMap([herbs({ chance: 30 }), herbs({ id: "e2", resourceKey: "moonpetal", name: "Pétale", chance: 5 })]) };

  assert.equal(gm(harvest, { type: "setEntryChance", biomeId: "forest", entryId: "e1", chance: "12,5" }).harvest.map.biomes[0].entries[0].chance, 12.5);
  assert.equal(gm(harvest, { type: "setEntryQuantity", biomeId: "forest", entryId: "e1", quantity: " 2d4 " }).harvest.map.biomes[0].entries[0].quantity, "2d4");

  assert.throws(() => gm(harvest, { type: "setEntryChance", biomeId: "forest", entryId: "e1", chance: "96" }), { message: "SODLTRADE.Errors.ChanceOver100" });
  assert.throws(() => gm(harvest, { type: "setEntryChance", biomeId: "forest", entryId: "e1", chance: "-1" }), { message: "SODLTRADE.Errors.InvalidChance" });
  assert.throws(() => gm(harvest, { type: "setEntryQuantity", biomeId: "forest", entryId: "e1", quantity: "beaucoup" }), { message: "SODLTRADE.Errors.InvalidDice" });
  assert.equal(totalChance(harvest.map.biomes[0]), 35);
});

test("un objet ajouté à un biome déjà plein arrive à 0 %, en attendant que le MJ fasse de la place", () => {
  const harvest = { site: null, map: forestMap([herbs({ chance: 99.5 })]) };
  const entries = [{ id: "e2", resourceKey: null, sourceUuid: "Item.potion", name: "Potion", img: "p.webp", type: "item" }];

  const next = gm(harvest, { type: "addEntries", biomeId: "forest", entries }).harvest;

  assert.deepEqual(next.map.biomes[0].entries.map((entry) => entry.chance), [99.5, 0.5]);
});

test("supprimer le biome ouvert ferme la récolte", () => {
  const harvest = { site: { biome: "forest", attribute: "perception", boons: 0, harvestedBy: [] }, map: forestMap([]) };

  assert.equal(gm(harvest, { type: "removeBiome", biomeId: "forest" }).harvest.site, null);
});

test("réinitialiser remplace la carte par celle du catalogue et ferme la récolte", () => {
  const harvest = { site: { biome: "forest", attribute: "perception", boons: 0, harvestedBy: [] }, map: forestMap([]) };
  const map = { realms: [], biomes: [] };

  assert.deepEqual(gm(harvest, { type: "reset", map }).harvest, { site: null, map });
});

test("les joueurs ne modifient pas la carte", () => {
  const harvest = { site: null, map: forestMap([]) };

  assert.throws(() => player(harvest, { type: "addBiome", id: "x", realm: "mortal", name: "X" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("le MJ ouvre la récolte dans un biome existant avec le jet demandé, puis la ferme", () => {
  const harvest = { site: null, map: forestMap([]) };

  const opened = gm(harvest, { type: "open", biome: "forest", attribute: "perception", boons: "1" });
  assert.deepEqual(opened.harvest.site, { biome: "forest", attribute: "perception", boons: 1, harvestedBy: [] });
  assert.equal(opened.event, "opened");

  assert.equal(gm(opened.harvest, { type: "close" }).harvest.site, null);
  assert.throws(() => gm(harvest, { type: "open", biome: "desert", attribute: "perception", boons: 0 }), { message: "SODLTRADE.Errors.BiomeGone" });
  assert.throws(() => gm(harvest, { type: "open", biome: "forest", attribute: "charisme", boons: 0 }), { message: "SODLTRADE.Errors.InvalidAttribute" });
});

test("un personnage récolte une seule fois tant que le MJ ne renouvelle pas la récolte", () => {
  const harvest = { site: { biome: "forest", attribute: "perception", boons: 0, harvestedBy: [] }, map: forestMap([herbs({})]) };

  const first = player(harvest, { type: "harvest", actorId: "a" });
  assert.deepEqual(first.attempt, { actorId: "a", biome: "forest", entries: [herbs({})], check: { attribute: "perception", boons: 0 } });
  assert.deepEqual(first.harvest.site.harvestedBy, ["a"]);

  assert.throws(() => player(first.harvest, { type: "harvest", actorId: "a" }), { message: "SODLTRADE.Errors.AlreadyHarvested" });
  assert.deepEqual(gm(first.harvest, { type: "renew" }).harvest.site.harvestedBy, []);
});

test("on ne récolte ni quand la récolte est fermée, ni pour le personnage d'un autre", () => {
  const open = { site: { biome: "forest", attribute: "perception", boons: 0, harvestedBy: [] }, map: forestMap([]) };

  assert.throws(() => player({ ...emptyHarvest(), map: forestMap([]) }, { type: "harvest", actorId: "a" }), { message: "SODLTRADE.Errors.HarvestClosed" });
  assert.throws(() => player(open, { type: "harvest", actorId: "b" }), { message: "SODLTRADE.Errors.NotYourCharacter" });
});

test("la carte tirée du catalogue livré a des noms dans les deux langues, des biomes garnis et des totaux d'au plus 100 %", () => {
  const catalog = JSON.parse(readFileSync(new URL("../../data/resources.json", import.meta.url), "utf8"));

  for (const lang of ["fr", "en"]) {
    const map = seedHarvestMap(catalog, lang);
    assert.ok(map.realms.every((realm) => realm.name && map.biomes.some((biome) => biome.realm === realm.id)), lang);
    for (const biome of map.biomes) {
      assert.ok(biome.name && biome.description && biome.entries.length > 0, biome.id);
      assert.ok(totalChance(biome) <= 100, biome.id);
      assert.ok(biome.entries.every((entry) => rollQuantity(entry.quantity, () => 0) >= 1), biome.id);
    }
  }
});
