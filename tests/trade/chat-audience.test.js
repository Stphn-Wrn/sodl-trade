import { test } from "node:test";
import assert from "node:assert/strict";
import { chatDelivery } from "../../src/trade/chat-audience.js";

test("chaque réglage donne les destinataires d'un message", () => {
  const people = { gmIds: ["gm"], involvedIds: ["gm", "p1"] };

  assert.equal(chatDelivery("off", people), null);
  assert.deepEqual(chatDelivery("gm", people), { whisper: ["gm"] });
  assert.deepEqual(chatDelivery("involved", people), { whisper: ["gm", "p1"] });
  assert.deepEqual(chatDelivery("everyone", people), {});
});

test("un message restreint par nature n'est jamais public, même réglé sur tout le monde", () => {
  const people = { gmIds: ["gm"], involvedIds: ["gm", "p1"], restricted: true };

  assert.deepEqual(chatDelivery("everyone", people), { whisper: ["gm", "p1"] });
});

test("un réglage inconnu retombe sur les personnes concernées", () => {
  assert.deepEqual(chatDelivery("bizarre", { gmIds: ["gm"], involvedIds: ["gm", "p1"] }), { whisper: ["gm", "p1"] });
});
