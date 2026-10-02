import { test } from "node:test";
import assert from "node:assert/strict";
import { planTransfer, prepareReceivedItem } from "../../src/trade/transfer-plan.js";

function party(actorId, items, wealth) {
  return { actorId, accepted: true, offer: { items, wealth: { gc: 0, ss: 0, cp: 0, bits: 0, ...wealth } } };
}

test("le plan retire les objets donnés, ajoute les objets reçus et règle les bourses", () => {
  const trade = {
    status: "approved",
    parties: [
      party("a", [{ itemId: "sword", quantity: 1 }, { itemId: "torch", quantity: 2 }], {}),
      party("b", [], { ss: 5 })
    ]
  };
  const inventories = [
    { wealth: { gc: 2, ss: 0, cp: 0, bits: 0 }, items: [{ id: "sword", name: "Épée", quantity: 1 }, { id: "torch", name: "Torche", quantity: 3 }] },
    { wealth: { gc: 0, ss: 5, cp: 0, bits: 0 }, items: [] }
  ];

  assert.deepEqual(planTransfer(trade, inventories), [
    {
      actorId: "a",
      wealth: { gc: 2, ss: 5, cp: 0, bits: 0 },
      deleteItemIds: ["sword"],
      updateItems: [{ _id: "torch", "system.quantity": 1 }],
      receiveItems: []
    },
    {
      actorId: "b",
      wealth: { gc: 0, ss: 0, cp: 0, bits: 0 },
      deleteItemIds: [],
      updateItems: [],
      receiveItems: [{ sourceActorId: "a", itemId: "sword", quantity: 1 }, { sourceActorId: "a", itemId: "torch", quantity: 2 }]
    }
  ]);
});

test("donner un bouclier transfère aussi sa version arme", () => {
  const trade = { status: "approved", parties: [party("a", [{ itemId: "shield", quantity: 1 }], {}), party("b", [], {})] };
  const inventories = [
    { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [{ id: "shield", name: "Petit Bouclier", quantity: 1, linked: [{ id: "bash", quantity: 1 }] }] },
    { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [] }
  ];

  const [giver, receiver] = planTransfer(trade, inventories);

  assert.deepEqual(giver.deleteItemIds, ["shield", "bash"]);
  assert.deepEqual(receiver.receiveItems, [{ sourceActorId: "a", itemId: "shield", quantity: 1 }, { sourceActorId: "a", itemId: "bash", quantity: 1 }]);
});

test("le plan échoue si un objet offert a été vendu ou consommé depuis la négociation", () => {
  const trade = { status: "approved", parties: [party("a", [{ itemId: "torch", quantity: 2 }], {}), party("b", [], {})] };
  const inventories = [
    { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [{ id: "torch", name: "Torche", quantity: 1 }] },
    { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [] }
  ];

  assert.throws(() => planTransfer(trade, inventories), { message: "SODLTRADE.Errors.NotEnoughItems" });
});

test("le plan échoue si l'argent offert a été dépensé depuis la négociation", () => {
  const trade = { status: "approved", parties: [party("a", [], { gc: 3 }), party("b", [], {})] };
  const inventories = [
    { wealth: { gc: 1, ss: 0, cp: 0, bits: 0 }, items: [] },
    { wealth: { gc: 0, ss: 0, cp: 0, bits: 0 }, items: [] }
  ];

  assert.throws(() => planTransfer(trade, inventories), { message: "SODLTRADE.Errors.NotEnoughWealth" });
});

test("l'objet reçu est une copie à la quantité échangée, déséquipée, sans l'identifiant d'origine", () => {
  const source = { _id: "sword", name: "Épée", type: "weapon", system: { quantity: 3, wear: true, damage: "2d6" } };

  assert.deepEqual(prepareReceivedItem(source, 2), { name: "Épée", type: "weapon", system: { quantity: 2, wear: false, damage: "2d6" } });
  assert.equal(source.system.quantity, 3);
});
