// Other modules add tabs, kinds of request and ways to discover recipes through this registry,
// so the core never needs to know about them.
export function createExtensionRegistry() {
  const panels = [];
  const requests = new Map();
  const discoveries = new Map();
  return {
    registerPanel(panel, { before = null } = {}) {
      panels.push({ panel, before });
    },

    // The core's tabs with the extensions' ones slotted in where they asked.
    panels(builtins) {
      const merged = [...builtins];
      for (const { panel, before } of panels) {
        const index = merged.findIndex((entry) => entry.id === before);
        if (index === -1) {
          merged.push(panel);
        } else {
          merged.splice(index, 0, panel);
        }
      }
      return merged;
    },

    // A request runs on the GM's client and needs no approval unless the extension says otherwise.
    registerRequest(type, descriptor) {
      if (requests.has(type)) {
        throw new Error(`Request type "${type}" is already registered`);
      }
      requests.set(type, { ownClient: false, approvalActions: [], describeCreation: null, ...descriptor });
    },

    request(type) {
      return requests.get(type) ?? null;
    },

    registerRecipeDiscovery(name, rule) {
      discoveries.set(name, rule);
    },

    recipeDiscovery(name) {
      return discoveries.get(name) ?? null;
    }
  };
}

export const extensions = createExtensionRegistry();
