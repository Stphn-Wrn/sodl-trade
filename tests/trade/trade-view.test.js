import { test } from "node:test";
import assert from "node:assert/strict";
import { describeOffer, tradeView } from "../../src/trade/trade-view.js";
import { t } from "../helpers/i18n.js";

function trade(overrides) {
  return {
    id: "t1",
    status: "negotiating",
    parties: [
      { actorId: "a", name: "Bartoras", img: "a.webp", accepted: true, offer: { items: [{ itemId: "torch", name: "Torche", img: "t.webp", quantity: 2 }], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } } },
      { actorId: "b", name: "Ilsa", img: "b.webp", accepted: false, offer: { items: [], wealth: { gc: 1, ss: 0, cp: 3, bits: 0 } } }
    ],
    ...overrides
  };
}

test("une offre se résume en une ligne lisible pour le chat", () => {
  const offer = { items: [{ name: "Torche", quantity: 2 }, { name: "Épée", quantity: 1 }], wealth: { gc: 1, ss: 0, cp: 3, bits: 0 } };

  assert.equal(describeOffer(offer, t), "Torche ×2, Épée, 1 CO, 3 SC");
  assert.equal(describeOffer({ items: [], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } }, t), "Rien");
});

test("le joueur voit sa colonne modifiable et le reste de son inventaire, rangé comme sur sa fiche", () => {
  const inventory = {
    wealth: { gc: 0, ss: 0, cp: 0, bits: 0 },
    items: [
      { id: "torch", name: "Torche", img: "t.webp", type: "item", quantity: 3 },
      { id: "sword", name: "Épée", img: "s.webp", type: "weapon", quantity: 1 },
      { id: "rope", name: "Corde", img: "r.webp", type: "item", quantity: 1 }
    ]
  };

  const view = tradeView(trade({}), 0, inventory, t);

  assert.deepEqual(view.parties.map((party) => [party.name, party.isMine, party.editable]), [["Ilsa", false, false], ["Bartoras", true, true]]);
  assert.deepEqual(view.inventoryGroups, [
    { id: "combat", label: "Combat", items: [{ id: "sword", name: "Épée", img: "s.webp", available: 1 }] },
    { id: "gear", label: "Inventaire", items: [{ id: "torch", name: "Torche", img: "t.webp", available: 1 }, { id: "rope", name: "Corde", img: "r.webp", available: 1 }] }
  ]);
  assert.deepEqual([view.canAccept, view.canWithdraw, view.canApprove, view.canCancel], [false, true, false, true]);
});

test("l'argent du joueur indique ce qu'il possède, celui de l'autre se résume en une ligne", () => {
  const inventory = { wealth: { gc: 2, ss: 12, cp: 0, bits: 5 }, items: [] };

  const view = tradeView(trade({}), 0, inventory, t);

  const [partner, mine] = view.parties;
  assert.deepEqual(mine.wealth.map((coin) => [coin.denomination, coin.value, coin.owned]), [["gc", 0, 2], ["ss", 0, 12], ["cp", 0, 0], ["bits", 0, 5]]);
  assert.equal(partner.wealthText, "1 CO, 3 SC");
  assert.equal(mine.wealthText, "Aucun argent");
});

test("le joueur voit son partenaire à gauche et sa propre colonne contre son inventaire, le MJ garde l'ordre de l'échange", () => {
  assert.deepEqual(tradeView(trade({}), 0, { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [] }, t).parties.map((party) => party.name), ["Ilsa", "Bartoras"]);
  assert.deepEqual(tradeView(trade({}), 1, { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [] }, t).parties.map((party) => party.name), ["Bartoras", "Ilsa"]);
  assert.deepEqual(tradeView(trade({}), "gm", null, t).parties.map((party) => party.name), ["Bartoras", "Ilsa"]);
});

test("le MJ peut approuver uniquement quand les deux joueurs ont validé", () => {
  assert.equal(tradeView(trade({}), "gm", null, t).canApprove, false);

  const view = tradeView(trade({ status: "awaitingApproval" }), "gm", null, t);

  assert.equal(view.canApprove, true);
  assert.equal(view.statusLabel, "En attente de l'approbation du MJ");
  assert.equal(view.parties.some((party) => party.editable), false);
});
