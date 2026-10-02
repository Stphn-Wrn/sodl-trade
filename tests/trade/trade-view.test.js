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

test("le joueur voit sa colonne modifiable et le reste de son inventaire disponible", () => {
  const inventory = { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [{ id: "torch", name: "Torche", img: "t.webp", quantity: 3 }, { id: "rope", name: "Corde", img: "r.webp", quantity: 1 }] };

  const view = tradeView(trade({}), 0, inventory, t);

  assert.deepEqual(view.parties.map((party) => [party.name, party.isMine, party.editable]), [["Bartoras", true, true], ["Ilsa", false, false]]);
  assert.deepEqual(view.inventory, [{ id: "torch", name: "Torche", available: 1 }, { id: "rope", name: "Corde", available: 1 }]);
  assert.deepEqual([view.canAccept, view.canWithdraw, view.canApprove, view.canCancel], [false, true, false, true]);
});

test("le MJ peut approuver uniquement quand les deux joueurs ont validé", () => {
  assert.equal(tradeView(trade({}), "gm", null, t).canApprove, false);

  const view = tradeView(trade({ status: "awaitingApproval" }), "gm", null, t);

  assert.equal(view.canApprove, true);
  assert.equal(view.statusLabel, "En attente de l'approbation du MJ");
  assert.equal(view.parties.some((party) => party.editable), false);
});
