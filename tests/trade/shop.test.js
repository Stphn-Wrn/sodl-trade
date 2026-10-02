import { test } from "node:test";
import assert from "node:assert/strict";
import { applyShopAction, emptyShop, openCategories } from "../../src/trade/shop.js";

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
  assert.deepEqual(shop.categories, [{ id: "c1", name: "Forgeron", open: false, items: [] }]);

  shop = gm(shop, { type: "renameCategory", categoryId: "c1", name: "Armurier" }).shop;
  assert.equal(shop.categories[0].name, "Armurier");

  assert.deepEqual(gm(shop, { type: "removeCategory", categoryId: "c1" }).shop.categories, []);
});

test("le nom d'une catégorie est débarrassé des espaces superflus", () => {
  const shop = gm(emptyShop(), { type: "addCategory", id: "c1", name: "  Forgeron " }).shop;

  assert.equal(shop.categories[0].name, "Forgeron");
});

test("remplir une catégorie reprend le nom, le prix, la disponibilité et la taille du lot de chaque objet, en stock illimité", () => {
  const entries = [entry({}), entry({ id: "i2", sourceUuid: "Item.arrows", name: "Flèches", type: "ammo", value: "1 cp", quantity: 20, availability: "" })];

  const shop = gm(smithy([]), { type: "addItems", categoryId: "c1", entries }).shop;

  assert.deepEqual(shop.categories[0].items, [
    { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: null, linkedUuids: [] },
    { id: "i2", sourceUuid: "Item.arrows", name: "Flèches", img: "s.webp", bundle: 20, price: { gc: 0, ss: 0, cp: 1, bits: 0 }, availability: "", stock: null, linkedUuids: [] }
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

  assert.deepEqual(purchase, { actorId: "a", sourceUuid: "Item.arrows", linkedUuids: [], name: "Flèches", units: 60, lots: 3, cost: { gc: 0, ss: 0, cp: 3, bits: 0 } });
});

test("un objet sans prix ne peut pas être acheté, et un joueur n'achète que pour son personnage", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "" }]);

  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1 }), { message: "SODLTRADE.Errors.NoPrice" });
  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "b", quantity: 1 }), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => player(shop, { type: "addCategory", id: "c2", name: "Alchimiste" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("le MJ fixe le stock d'un objet, ou le rend illimité en vidant le champ", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "", stock: null }]);

  const stocked = gm(shop, { type: "setStock", categoryId: "c1", itemId: "i1", stock: "3" }).shop;
  assert.equal(stocked.categories[0].items[0].stock, 3);

  assert.equal(gm(stocked, { type: "setStock", categoryId: "c1", itemId: "i1", stock: "" }).shop.categories[0].items[0].stock, null);
  assert.throws(() => gm(shop, { type: "setStock", categoryId: "c1", itemId: "i1", stock: "-2" }), { message: "SODLTRADE.Errors.InvalidQuantity" });
  assert.throws(() => player(shop, { type: "setStock", categoryId: "c1", itemId: "i1", stock: "9" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("un achat retire du stock les lots achetés", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: 3 }]);

  const result = player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2 });

  assert.equal(result.shop.categories[0].items[0].stock, 1);
  assert.equal(result.purchase.units, 2);
});

test("on ne peut pas acheter plus que le stock, ni un objet épuisé", () => {
  const shop = smithy([
    { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: 1 },
    { id: "i2", sourceUuid: "Item.shield", name: "Bouclier", img: "b.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: 0 }
  ]);

  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2 }), { message: "SODLTRADE.Errors.NotEnoughStock" });
  assert.throws(() => player(shop, { type: "buy", categoryId: "c1", itemId: "i2", actorId: "a", quantity: 1 }), { message: "SODLTRADE.Errors.OutOfStock" });
});

test("un objet en stock illimité reste toujours disponible", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: null }]);

  assert.equal(player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 50 }).shop.categories[0].items[0].stock, null);
});

test("un bouclier vendu en boutique est livré avec sa version arme", () => {
  const shop = gm(smithy([]), { type: "addItems", categoryId: "c1", entries: [entry({ id: "i1", sourceUuid: "A.shield", name: "Petit Bouclier", type: "armor", linkedUuids: ["W.shield"] })] }).shop;

  const { purchase } = player(shop, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1 });

  assert.deepEqual(purchase.linkedUuids, ["W.shield"]);
});

test("importer un dossier contenant les deux versions d'un bouclier n'en affiche qu'une", () => {
  const entries = [
    entry({ id: "i1", sourceUuid: "A.shield", name: "Petit Bouclier", type: "armor", linkedUuids: ["W.shield"] }),
    entry({ id: "i2", sourceUuid: "W.shield", name: "Petit bouclier", type: "weapon", linkedUuids: ["A.shield"] })
  ];

  const shop = gm(smithy([]), { type: "addItems", categoryId: "c1", entries }).shop;

  assert.deepEqual(shop.categories[0].items.map((item) => item.sourceUuid), ["A.shield"]);
});

test("quand les deux versions d'un bouclier sont importées, c'est la version armure qui est affichée", () => {
  const entries = [
    entry({ id: "i2", sourceUuid: "W.shield", name: "Petit bouclier", type: "weapon", linkedUuids: ["A.shield"] }),
    entry({ id: "i3", sourceUuid: "Item.rope", name: "Corde", type: "item" }),
    entry({ id: "i1", sourceUuid: "A.shield", name: "Petit Bouclier", type: "armor", linkedUuids: ["W.shield"] })
  ];

  const shop = gm(smithy([]), { type: "addItems", categoryId: "c1", entries }).shop;

  assert.deepEqual(shop.categories[0].items.map((item) => item.sourceUuid), ["Item.rope", "A.shield"]);
});

test("le stock saisi par le MJ devient le niveau de réapprovisionnement de l'objet", () => {
  const shop = smithy([{ id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock: null }]);

  const stocked = gm(shop, { type: "setStock", categoryId: "c1", itemId: "i1", stock: "3" }).shop;

  assert.deepEqual([stocked.categories[0].items[0].stock, stocked.categories[0].items[0].restock], [3, 3]);
});

test("réapprovisionner remet le stock de chaque objet à son niveau, sans toucher aux objets illimités", () => {
  const shop = {
    categories: [
      { id: "c1", name: "Forgeron", items: [
        { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: null, availability: "", stock: 0, restock: 3 },
        { id: "i2", sourceUuid: "Item.rope", name: "Corde", img: "r.webp", bundle: 1, price: null, availability: "", stock: null, restock: null }
      ] },
      { id: "c2", name: "Alchimiste", items: [
        { id: "i3", sourceUuid: "Item.potion", name: "Potion", img: "p.webp", bundle: 1, price: null, availability: "", stock: 1, restock: 5 }
      ] }
    ]
  };

  const all = gm(shop, { type: "restock" }).shop;
  assert.deepEqual(all.categories.flatMap((category) => category.items.map((item) => item.stock)), [3, null, 5]);

  const smith = gm(shop, { type: "restock", categoryId: "c1" }).shop;
  assert.deepEqual(smith.categories.flatMap((category) => category.items.map((item) => item.stock)), [3, null, 1]);

  assert.throws(() => player(shop, { type: "restock" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

function sword(stock) {
  return { id: "i1", sourceUuid: "Item.sword", name: "Épée", img: "s.webp", bundle: 1, price: { gc: 0, ss: 5, cp: 0, bits: 0 }, availability: "C", stock, restock: stock, linkedUuids: [] };
}

function strictPlayer(shop, action) {
  return applyShopAction(shop, action, { isGM: false, ownsActor: (actorId) => actorId === "a", defaultUnit: "ss", requireApproval: true });
}

function strictGm(shop, action) {
  return applyShopAction(shop, action, { isGM: true, ownsActor: () => false, defaultUnit: "ss", requireApproval: true });
}

test("quand le MJ doit valider, acheter crée une demande sans débiter ni toucher au stock", () => {
  const result = strictPlayer(smithy([sword(3)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" });

  assert.equal(result.purchase, null);
  assert.equal(result.event, "ordered");
  assert.equal(result.shop.categories[0].items[0].stock, 3);
  assert.deepEqual(result.shop.orders, [{ id: "o1", actorId: "a", categoryId: "c1", itemId: "i1", name: "Épée", img: "s.webp", lots: 2, units: 2, cost: { gc: 1, ss: 0, cp: 0, bits: 0 }, sourceUuid: "Item.sword", linkedUuids: [] }]);
});

test("une demande ne peut pas dépasser le stock ni porter sur un objet sans prix", () => {
  assert.throws(() => strictPlayer(smithy([sword(1)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" }), { message: "SODLTRADE.Errors.NotEnoughStock" });
  assert.throws(() => strictPlayer(smithy([{ ...sword(null), price: null }]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1, orderId: "o1" }), { message: "SODLTRADE.Errors.NoPrice" });
});

test("le MJ valide une demande au prix demandé : l'achat a lieu, le stock baisse et la demande disparaît", () => {
  let shop = strictPlayer(smithy([sword(3)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" }).shop;
  shop = { ...shop, categories: [{ ...shop.categories[0], items: [{ ...shop.categories[0].items[0], price: { gc: 9, ss: 0, cp: 0, bits: 0 } }] }] };

  const result = strictGm(shop, { type: "approveOrder", orderId: "o1" });

  assert.deepEqual(result.purchase, { actorId: "a", sourceUuid: "Item.sword", linkedUuids: [], name: "Épée", units: 2, lots: 2, cost: { gc: 1, ss: 0, cp: 0, bits: 0 } });
  assert.equal(result.shop.categories[0].items[0].stock, 1);
  assert.deepEqual(result.shop.orders, []);
});

test("une demande ne peut plus être validée si le stock a été vendu entre-temps", () => {
  let shop = strictPlayer(smithy([sword(2)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" }).shop;
  shop = { ...shop, categories: [{ ...shop.categories[0], items: [{ ...shop.categories[0].items[0], stock: 1 }] }] };

  assert.throws(() => strictGm(shop, { type: "approveOrder", orderId: "o1" }), { message: "SODLTRADE.Errors.NotEnoughStock" });
});

test("le MJ refuse une demande, ou le joueur l'annule ; un autre joueur ne peut pas y toucher", () => {
  const shop = strictPlayer(smithy([sword(3)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1, orderId: "o1" }).shop;

  const rejected = strictGm(shop, { type: "rejectOrder", orderId: "o1" });
  assert.deepEqual([rejected.shop.orders, rejected.event, rejected.order.id], [[], "rejected", "o1"]);

  const cancelled = strictPlayer(shop, { type: "cancelOrder", orderId: "o1" });
  assert.deepEqual([cancelled.shop.orders, cancelled.event], [[], "cancelled"]);

  const stranger = (current, action) => applyShopAction(current, action, { isGM: false, ownsActor: () => false, defaultUnit: "ss", requireApproval: true });
  assert.throws(() => stranger(shop, { type: "cancelOrder", orderId: "o1" }), { message: "SODLTRADE.Errors.NotYourCharacter" });
  assert.throws(() => strictPlayer(shop, { type: "approveOrder", orderId: "o1" }), { message: "SODLTRADE.Errors.NotAllowed" });
  assert.throws(() => strictGm(shop, { type: "approveOrder", orderId: "gone" }), { message: "SODLTRADE.Errors.OrderGone" });
});

test("le MJ peut changer le prix total d'une demande avant de la valider", () => {
  const shop = strictPlayer(smithy([sword(3)]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" }).shop;

  const discounted = strictGm(shop, { type: "setOrderCost", orderId: "o1", text: "8 CA" });
  assert.deepEqual([discounted.shop.orders[0].cost, discounted.event], [{ gc: 0, ss: 8, cp: 0, bits: 0 }, "updated"]);

  const free = strictGm(shop, { type: "setOrderCost", orderId: "o1", text: "0" });
  assert.deepEqual(free.shop.orders[0].cost, { gc: 0, ss: 0, cp: 0, bits: 0 });

  assert.equal(strictGm(discounted.shop, { type: "approveOrder", orderId: "o1" }).purchase.cost.ss, 8);
  assert.throws(() => strictGm(shop, { type: "setOrderCost", orderId: "o1", text: "beaucoup" }), { message: "SODLTRADE.Errors.InvalidPrice" });
  assert.throws(() => strictPlayer(shop, { type: "setOrderCost", orderId: "o1", text: "0" }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("changer la quantité d'une demande ajuste le prix et les unités livrées en proportion", () => {
  const arrows = { ...sword(null), name: "Flèches", bundle: 20, price: { gc: 0, ss: 0, cp: 1, bits: 0 } };
  const shop = strictPlayer(smithy([arrows]), { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 2, orderId: "o1" }).shop;

  const order = strictGm(shop, { type: "setOrderLots", orderId: "o1", lots: "5" }).shop.orders[0];

  assert.deepEqual([order.lots, order.units, order.cost], [5, 100, { gc: 0, ss: 0, cp: 5, bits: 0 }]);
  assert.throws(() => strictGm(shop, { type: "setOrderLots", orderId: "o1", lots: "0" }), { message: "SODLTRADE.Errors.InvalidQuantity" });
});

test("une nouvelle catégorie est fermée aux joueurs, et le MJ l'ouvre ou la ferme", () => {
  const created = gm(emptyShop(), { type: "addCategory", id: "c1", name: "Forgeron" }).shop;
  assert.equal(created.categories[0].open, false);

  const opened = gm(created, { type: "setCategoryOpen", categoryId: "c1", open: true }).shop;
  assert.equal(opened.categories[0].open, true);

  assert.throws(() => player(created, { type: "setCategoryOpen", categoryId: "c1", open: true }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("on ne peut rien acheter ni demander dans une boutique fermée", () => {
  const closed = { categories: [{ id: "c1", name: "Forgeron", open: false, items: [sword(3)] }] };

  assert.throws(() => player(closed, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1 }), { message: "SODLTRADE.Errors.ShopClosed" });
  assert.throws(() => strictPlayer(closed, { type: "buy", categoryId: "c1", itemId: "i1", actorId: "a", quantity: 1, orderId: "o1" }), { message: "SODLTRADE.Errors.ShopClosed" });
});

test("une boutique créée avant l'ouverture des boutiques reste ouverte, et seules les boutiques ouvertes et garnies sont visibles", () => {
  const shop = {
    categories: [
      { id: "old", name: "Ancienne", items: [sword(null)] },
      { id: "closed", name: "Fermée", open: false, items: [sword(null)] },
      { id: "empty", name: "Vide", open: true, items: [] }
    ]
  };

  assert.deepEqual(openCategories(shop).map((category) => category.id), ["old"]);
});
