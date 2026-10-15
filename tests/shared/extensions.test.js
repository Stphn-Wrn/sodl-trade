import { test } from "node:test";
import assert from "node:assert/strict";
import { createExtensionRegistry } from "../../src/shared/extensions.js";

test("une extension ajoute un onglet à la fin, ou avant un onglet donné", () => {
  const registry = createExtensionRegistry();
  registry.registerPanel({ id: "alchemy" }, { before: "harvest" });
  registry.registerPanel({ id: "bestiary" });

  const panels = registry.panels([{ id: "trades" }, { id: "harvest" }]);

  assert.deepEqual(panels.map((panel) => panel.id), ["trades", "alchemy", "harvest", "bestiary"]);
});

test("une extension ajoute un type de demande, qui ne peut pas être enregistré deux fois", () => {
  const registry = createExtensionRegistry();
  const handler = () => {};
  registry.registerRequest("alchemy", { handler, enabled: () => true, ownClient: true, approvalActions: ["brew"] });

  assert.equal(registry.request("alchemy").handler, handler);
  assert.equal(registry.request("alchemy").ownClient, true);
  assert.equal(registry.request("unknown"), null);
  assert.throws(() => registry.registerRequest("alchemy", { handler, enabled: () => true }), /alchemy/);
});

test("une demande d'extension se fait sur le MJ et sans validation, sauf si elle le précise", () => {
  const registry = createExtensionRegistry();
  registry.registerRequest("essences", { handler: () => {}, enabled: () => true });

  assert.equal(registry.request("essences").ownClient, false);
  assert.deepEqual(registry.request("essences").approvalActions, []);
});

test("une extension fournit une façon de découvrir des recettes", () => {
  const registry = createExtensionRegistry();
  const rule = () => ["r1"];
  registry.registerRecipeDiscovery("cauldron", rule);

  assert.equal(registry.recipeDiscovery("cauldron"), rule);
  assert.equal(registry.recipeDiscovery("unknown"), null);
});
