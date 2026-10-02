import { test } from "node:test";
import assert from "node:assert/strict";
import { applyShopAction, emptyShop } from "../../src/trade/shop.js";

function entry(overrides) {
  return { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", type: "weapon", value: "5 ss", quantity: 1, availability: "C", ...overrides };
}

function gm(shop, action) {
  return applyShopAction(shop, action, { isGM: true, ownsActor: () => false, defaultUnit: "ss" });
}

function player(shop, action) {
  return applyShopAction(shop, action, { isGM: false, ownsActor: (actorId) => actorId === "a", defaultUnit: "ss" });
}

function smithy(items) {
  return { categories: [{ id: "c1", name: "Forgeron", items }] };
}

test("le MJ crée une catégorie, la renomme puis la supprime", () => {
  let shop = gm(emptyShop(), { type: "addCategory", id: "c1", name: "Forgeron" }).shop;
  assert.deepEqual(shop.categories, [{ id: "c1", name: "Forgeron", items: [] }]);

  shop = gm(shop, { type: "renameCategory", categoryId: "c1", name: "Armurier" }).shop;
  assert.equal(shop.categories[0].name, "Armurier");

  assert.deepEqual(gm(shop, { type: "removeCategory", categoryId: "c1" }).shop.categories, []);
});

test("le nom d'une catégorie est débarrassé des espaces superflus", () => {
  const shop = gm(emptyShop(), { type: "addCategory", id: "c1", name: "  Forgeron " }).shop;

  assert.equal(shop.categories[0].name, "Forgeron");
});

test("remplir une catégorie reprend le nom, le prix, la disponibilité et la taille du lot de chaque objet", () => {
  const entries = [entry({}), entry({ id: "i2", sourceUuid: "Item.arrows", name: "Flèches", type: "ammo", value: "1 cp", quantity: 20, availability: "" })];

  const shop = gm(smithy([]), { type: "addItems", categoryId: "c1", entries }).shop;

  assert.deepEqual(shop.categories[0].items, [
    { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C" },
    { id: "i2", sourceUuid: "Item.arrows", name: "Flèches", img: "s.webp", bundle: 20, price: { gc: 0, ss: 0, cp: 1, bits: 0 }, availability: "" }
  ]);
});

test("remplir une catégorie ignore les sorts, les talents et les objets déjà présents", () => {
  const shop = smithy([{ id: "old", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "" }]);
  const entries = [entry({}), entry({ id: "i2", sourceUuid: "Item.fire", name: "Boule de feu", type: "spell" })];

  assert.throws(() => gm(shop, { type: "addItems", categoryId: "c1", entries }), { message: "SODLTRADE.Errors.NothingImported" });
});

test("le MJ fixe le prix et la disponibilité d'un objet", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "" }]);

  const priced = gm(shop, { type: "setPrice", categoryId: "c1", itemId: "i1", text: "1 co 2 ca" }).shop;
  assert.deepEqual(priced.categories[0].items[0].price, { gc: 1, ss: 2, cp: 0, bits: 0 });

  const rare = gm(shop, { type: "setAvailability", categoryId: "c1", itemId: "i1", availability: "R" }).shop;
  assert.equal(rare.categories[0].items[0].availability, "R");

  assert.throws(() => gm(shop, { type: "setPrice", categoryId: "c1", itemId: "i1", text: "beaucoup" }), { message: "SODLTRADE.Errors.InvalidPrice" });
  assert.throws(() => gm(shop, { type: "setAvailability", categoryId: "c1", itemId: "i1", availability: "Z" }), { message: "SODLTRADE.Errors.InvalidAvailability" });
});

test("un joueur achète plusieurs lots : il reçoit toutes les unités et paie le prix de chaque lot", () => {
  const shop = smithy([{ id: "i2", sourceUuid: "Item.arrows", name: "Flèches", img: "f.webp", bundle: 20, price: { gc: 0, ss: 0, cp: 1, bits: 0 }, availability: "C" }]);

  const { purchase } = player(shop, { type: "buy", categoryId: "c1", itemId: "i2", actorId: "a", quantity: 3 });

  assert.deepEqual(purchase, { actorId: "a", sourceUuid: "Item.arrows", name: "Flèches", units: 60, cost: { gc: 0, ss: 0, cp: 3, bits: 0 } });
});

test("un objet sans prix ne peut pas être acheté, et un joueur n'achète que pour son personnage", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "" }]);

  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1 }), { message: "SODLTRADE.Errors.NoPrice" });
  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "b", quantity: 1 }), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => player(shop, { type: "addCategory", id: "c2", name: "Alchimiste" }), { message: "SODLTRADE.Errors.NotAllowed" });
});
