import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, createTrade, reopenTrade } from "../../src/trade/trade.js";

function newTrade() {
  return createTrade({
    id: "t1",
    initiator: { actorId: "a", name: "Bartoras", img: "a.webp" },
    target: { actorId: "b", name: "Ilsa", img: "b.webp" }
  });
}

function inventories() {
  return [
    { wealth: { gc: 2, ss: 0, cp: 0, bits: 0 }, items: [{ id: "sword", name: "Épée", img: "s.webp", quantity: 1 }, { id: "torch", name: "Torche", img: "t.webp", quantity: 3 }] },
    { wealth: { gc: 0, ss: 5, cp: 0, bits: 0 }, items: [{ id: "potion", name: "Potion", img: "p.webp", quantity: 2 }] }
  ];
}

function run(trade, role, action) {
  return applyAction(trade, action, { role, inventories: inventories() });
}

test("un nouvel échange démarre en négociation avec deux offres vides", () => {
  const trade = newTrade();

  assert.equal(trade.status, "negotiating");
  assert.deepEqual(trade.parties.map((party) => party.offer), [
    { items: [], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } },
    { items: [], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } }
  ]);
});

test("un joueur dépose un objet de son inventaire, puis le retire en mettant sa quantité à zéro", () => {
  const added = run(newTrade(), 0, { type: "setItem", itemId: "torch", quantity: 2 }).trade;
  assert.deepEqual(added.parties[0].offer.items, [{ itemId: "torch", name: "Torche", img: "t.webp", quantity: 2 }]);

  const removed = run(added, 0, { type: "setItem", itemId: "torch", quantity: 0 }).trade;
  assert.deepEqual(removed.parties[0].offer.items, []);
});

test("un joueur ne peut pas offrir plus d'objets ou d'argent qu'il n'en possède", () => {
  assert.throws(() => run(newTrade(), 0, { type: "setItem", itemId: "torch", quantity: 4 }), { message: "SODLTRADE.Errors.NotEnoughItems" });
  assert.throws(() => run(newTrade(), 0, { type: "setItem", itemId: "potion", quantity: 1 }), { message: "SODLTRADE.Errors.ItemNotOwned" });
  assert.throws(() => run(newTrade(), 1, { type: "setWealth", wealth: { ss: 6 } }), { message: "SODLTRADE.Errors.NotEnoughWealth" });
});

test("quand les deux joueurs valident, l'échange attend l'approbation du MJ", () => {
  let trade = run(newTrade(), 0, { type: "setItem", itemId: "sword", quantity: 1 }).trade;
  trade = run(trade, 1, { type: "setWealth", wealth: { ss: 5 } }).trade;
  trade = run(trade, 0, { type: "accept" }).trade;
  assert.equal(trade.status, "negotiating");

  const result = run(trade, 1, { type: "accept" });
  assert.equal(result.trade.status, "awaitingApproval");
  assert.equal(result.event, "awaitingApproval");
});

test("modifier une offre annule les validations des deux joueurs", () => {
  let trade = run(newTrade(), 0, { type: "setItem", itemId: "sword", quantity: 1 }).trade;
  trade = run(trade, 0, { type: "accept" }).trade;

  trade = run(trade, 1, { type: "setItem", itemId: "potion", quantity: 1 }).trade;

  assert.deepEqual(trade.parties.map((party) => party.accepted), [false, false]);
});

test("un échange où personne ne donne rien ne peut pas être validé", () => {
  assert.throws(() => run(newTrade(), 0, { type: "accept" }), { message: "SODLTRADE.Errors.EmptyTrade" });
});

test("seul le MJ approuve ou refuse, et seulement un échange validé par les deux joueurs", () => {
  let trade = run(newTrade(), 0, { type: "setItem", itemId: "sword", quantity: 1 }).trade;
  assert.throws(() => run(trade, "gm", { type: "approve" }), { message: "SODLTRADE.Errors.WrongStatus" });

  trade = run(trade, 0, { type: "accept" }).trade;
  trade = run(trade, 1, { type: "accept" }).trade;
  assert.throws(() => run(trade, 0, { type: "approve" }), { message: "SODLTRADE.Errors.NotAllowed" });

  assert.equal(run(trade, "gm", { type: "approve" }).trade.status, "approved");
  assert.equal(run(trade, "gm", { type: "reject" }).trade.status, "rejected");
});

test("un joueur qui retire sa validation renvoie l'échange en négociation", () => {
  let trade = run(newTrade(), 0, { type: "setItem", itemId: "sword", quantity: 1 }).trade;
  trade = run(trade, 0, { type: "accept" }).trade;
  trade = run(trade, 1, { type: "accept" }).trade;

  trade = run(trade, 1, { type: "withdraw" }).trade;

  assert.equal(trade.status, "negotiating");
  assert.deepEqual(trade.parties.map((party) => party.accepted), [true, false]);
});

test("un joueur ou le MJ peut annuler, mais un utilisateur étranger à l'échange ne peut rien faire", () => {
  assert.equal(run(newTrade(), 1, { type: "cancel" }).trade.status, "cancelled");
  assert.equal(run(newTrade(), "gm", { type: "cancel" }).trade.status, "cancelled");
  assert.throws(() => run(newTrade(), null, { type: "cancel" }), { message: "SODLTRADE.Errors.NotAllowed" });
  assert.throws(() => run(newTrade(), "gm", { type: "setItem", itemId: "sword", quantity: 1 }), { message: "SODLTRADE.Errors.NotAllowed" });
});

test("une action inconnue est refusée", () => {
  assert.throws(() => run(newTrade(), 0, { type: "steal" }), { message: "SODLTRADE.Errors.UnknownAction" });
});

test("un échange qui échoue à l'exécution revient en négociation, validations effacées", () => {
  let trade = run(newTrade(), 0, { type: "setItem", itemId: "sword", quantity: 1 }).trade;
  trade = run(trade, 0, { type: "accept" }).trade;
  trade = run(trade, 1, { type: "accept" }).trade;

  const reopened = reopenTrade(run(trade, "gm", { type: "approve" }).trade);

  assert.equal(reopened.status, "negotiating");
  assert.deepEqual(reopened.parties.map((party) => party.accepted), [false, false]);
  assert.equal(reopened.parties[0].offer.items.length, 1);
});
