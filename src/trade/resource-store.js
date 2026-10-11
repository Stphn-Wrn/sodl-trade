import { MODULE_ID, modulePath } from "../shared/constants.js";
import { t } from "../shared/foundry-adapter.js";
import { planResourceImport } from "./resources.js";

function flaggedFolder(flag, value) {
  return game.folders.find((folder) => folder.type === "Item" && folder.getFlag(MODULE_ID, flag) === value);
}

// Folders are found again by their flag, so the GM can rename or move them freely.
async function ensureFolder(flag, value, name, parentId) {
  const existing = flaggedFolder(flag, value);
  if (existing) {
    return existing;
  }
  return Folder.implementation.create({ name, type: "Item", folder: parentId, flags: { [MODULE_ID]: { [flag]: value } } });
}

let catalogRequest = null;

// The catalog ships with the module and never changes during a session, so it is fetched once.
export function loadResourceCatalog() {
  if (!catalogRequest) {
    catalogRequest = fetch(modulePath("data/resources.json")).then((response) => response.json());
  }
  return catalogRequest;
}

// Runs on the GM's client: world items are created directly, without going through the socket.
export async function importResources() {
  const catalog = await loadResourceCatalog();
  const existingKeys = game.items.map((item) => item.getFlag(MODULE_ID, "resource")).filter(Boolean);
  const plan = planResourceImport(catalog, game.i18n.lang, existingKeys);
  if (plan.length === 0) {
    ui.notifications.info(t("SODLTRADE.Notify.ResourcesUpToDate"));
    return;
  }
  const root = await ensureFolder("resourceRoot", true, t("SODLTRADE.Crafting.ResourcesFolder"), null);
  let count = 0;
  for (const folder of plan) {
    const target = await ensureFolder("resourceFolder", folder.key, folder.name, root.id);
    await Item.implementation.createDocuments(folder.items.map((item) => ({ ...item, folder: target.id })));
    count += folder.items.length;
  }
  ui.notifications.info(t("SODLTRADE.Notify.ResourcesCreated", { count }));
}
