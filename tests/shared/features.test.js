import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURES, featureOfRequest } from "../../src/shared/features.js";

test("chaque type de demande relève d'une fonctionnalité qu'on peut désactiver", () => {
  const requests = ["create", "act", "loot", "shop", "crafting", "harvest"];

  assert.deepEqual(requests.map(featureOfRequest), ["trades", "trades", "loot", "shop", "crafting", "harvest"]);
  assert.ok(requests.map(featureOfRequest).every((feature) => FEATURES.includes(feature)));
});

test("une demande inconnue ne relève d'aucune fonctionnalité", () => {
  assert.equal(featureOfRequest("unknown"), null);
});
