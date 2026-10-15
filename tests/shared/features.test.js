import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURES, featureOfRequest, needsApproval, runsOnOwnClient } from "../../src/shared/features.js";
import { createExtensionRegistry } from "../../src/shared/extensions.js";

test("chaque type de demande relève d'une fonctionnalité qu'on peut désactiver", () => {
  const requests = ["create", "act", "loot", "shop", "crafting", "lab", "harvest"];

  assert.deepEqual(requests.map(featureOfRequest), ["trades", "trades", "loot", "shop", "crafting", "crafting", "harvest"]);
  assert.ok(requests.map(featureOfRequest).every((feature) => FEATURES.includes(feature)));
});

test("une demande inconnue ne relève d'aucune fonctionnalité", () => {
  assert.equal(featureOfRequest("unknown"), null);
});

test("les demandes du module passent par le MJ ; une extension peut faire les siennes sur le client du joueur", () => {
  const registry = createExtensionRegistry();
  registry.registerRequest("alchemy", { handler: () => {}, enabled: () => true, ownClient: true });

  assert.deepEqual(["create", "act", "loot", "shop", "crafting", "lab", "harvest"].map((type) => runsOnOwnClient(type, registry)), [false, false, false, false, false, false, false]);
  assert.equal(runsOnOwnClient("alchemy", registry), true);
});

test("quand le MJ doit valider, ce qu'un joueur crée au laboratoire, ou par une extension qui le demande, passe par lui", () => {
  const registry = createExtensionRegistry();
  registry.registerRequest("alchemy", { handler: () => {}, enabled: () => true, approvalActions: ["brew"] });
  const requests = [
    { type: "lab", data: { action: { type: "writeIncantation" } } },
    { type: "lab", data: { action: { type: "copyIncantation" } } },
    { type: "lab", data: { action: { type: "brew" } } },
    { type: "lab", data: { action: { type: "mix" } } },
    { type: "alchemy", data: { action: { type: "brew" } } }
  ];

  assert.deepEqual(requests.map((request) => needsApproval(request, { isGM: false, requireApproval: true }, registry)), [true, true, true, true, true]);
  assert.deepEqual(requests.map((request) => needsApproval(request, { isGM: false, requireApproval: false }, registry)), [false, false, false, false, false]);
  assert.deepEqual(requests.map((request) => needsApproval(request, { isGM: true, requireApproval: true }, registry)), [false, false, false, false, false]);
});

test("ce qui ne crée rien ne demande pas de validation", () => {
  const registry = createExtensionRegistry();
  registry.registerRequest("alchemy", { handler: () => {}, enabled: () => true, approvalActions: ["brew"] });
  const requests = [
    { type: "lab", data: { action: { type: "identify" } } },
    { type: "alchemy", data: { action: { type: "study" } } },
    { type: "crafting", data: { action: { type: "craft" } } }
  ];

  assert.deepEqual(requests.map((request) => needsApproval(request, { isGM: false, requireApproval: true }, registry)), [false, false, false]);
});
