import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planResourceImport } from "../../src/trade/resources.js";
import { parsePrice } from "../../src/trade/price.js";

test("les ressources sont créées dans la langue de Foundry, comme objets du système avec prix et disponibilité", () => {
  const catalog = { folders: [{ key: "plants", name: { fr: "Plantes", en: "Plants" }, items: [
    { key: "herbs", name: { fr: "Herbes", en: "Herbs" }, description: { fr: "Des herbes.", en: "Some herbs." }, value: 0.01, availability: "C", img: "h.webp" }
  ] }] };

  const plan = planResourceImport(catalog, "fr", []);

  assert.deepEqual(plan, [{ key: "plants", name: "Plantes", items: [{
    name: "Herbes",
    type: "item",
    img: "h.webp",
    system: { description: "<p>Des herbes.</p>", value: "0.01", availability: "C", quantity: 1 },
    flags: { "sodl-trade": { resource: "herbs" } }
  }] }]);
});

test("une langue sans traduction reprend l'anglais", () => {
  const catalog = { folders: [{ key: "plants", name: { fr: "Plantes", en: "Plants" }, items: [
    { key: "herbs", name: { fr: "Herbes", en: "Herbs" }, description: { fr: "Des herbes.", en: "Some herbs." }, value: 0.01, availability: "C", img: "h.webp" }
  ] }] };

  const plan = planResourceImport(catalog, "de", []);

  assert.deepEqual([plan[0].name, plan[0].items[0].name], ["Plants", "Herbs"]);
});

test("une ressource déjà créée n'est pas recréée, et un dossier sans rien de nouveau est omis", () => {
  const catalog = { folders: [
    { key: "plants", name: { fr: "Plantes", en: "Plants" }, items: [{ key: "herbs", name: { fr: "Herbes", en: "Herbs" }, description: { fr: "", en: "" }, value: 0.01, availability: "C", img: "h.webp" }] },
    { key: "metals", name: { fr: "Métaux", en: "Metals" }, items: [{ key: "iron", name: { fr: "Fer", en: "Iron" }, description: { fr: "", en: "" }, value: 0.05, availability: "C", img: "i.webp" }] }
  ] };

  const plan = planResourceImport(catalog, "fr", ["herbs"]);

  assert.deepEqual(plan.map((folder) => folder.key), ["metals"]);
});

test("chaque ressource du catalogue livré a un nom dans les deux langues et un prix lisible", () => {
  const catalog = JSON.parse(readFileSync(new URL("../../data/resources.json", import.meta.url), "utf8"));
  const items = catalog.folders.flatMap((folder) => folder.items);

  assert.equal(new Set(items.map((item) => item.key)).size, items.length);
  for (const item of items) {
    assert.ok(item.name.fr && item.name.en && item.description.fr && item.description.en, item.key);
    assert.ok(parsePrice(String(item.value), "gc"), item.key);
  }
});
