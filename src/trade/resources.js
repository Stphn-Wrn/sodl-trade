const FALLBACK_LANG = "en";

function localized(text, lang) {
  return text[lang] ?? text[FALLBACK_LANG];
}

// The system stores an item's price as a number of gold crowns, in a text field.
export function resourceItemData(resource, lang) {
  return {
    name: localized(resource.name, lang),
    type: "item",
    img: resource.img,
    system: { description: `<p>${localized(resource.description, lang)}</p>`, value: String(resource.value), availability: resource.availability, quantity: 1 },
    flags: { "sodl-trade": { resource: resource.key } }
  };
}

export function localizedName(text, lang) {
  return localized(text, lang);
}

// The basic crafting resources still missing from the world, folder by folder.
// A resource is recognised by its key, so one renamed or moved by the GM is not created again.
export function planResourceImport(catalog, lang, existingKeys) {
  return catalog.folders
    .map((folder) => ({
      key: folder.key,
      name: localized(folder.name, lang),
      items: folder.items.filter((resource) => !existingKeys.includes(resource.key)).map((resource) => resourceItemData(resource, lang))
    }))
    .filter((folder) => folder.items.length > 0);
}
