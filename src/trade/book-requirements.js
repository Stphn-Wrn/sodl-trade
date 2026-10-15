// Who can make a potion by the Demon Lord's Companion's crafting rule: an apothecary,
// an alchemist or a brewmaster (Occult Philosophy). The shipped recipes in data/recipes.json list the same.
export const POTION_MAKERS = [
  { name: { fr: "Apothicaire ou guérisseur", en: "Apothecary or healer" }, aliases: ["Apothicaire", "Apothecary"] },
  { name: { fr: "Alchimiste", en: "Alchemist" } },
  { name: { fr: "Brewmaster", en: "Brewmaster" }, aliases: ["Maître brasseur"] }
];

export const ALCHEMIST_KIT_NAMES = ["Alchemist's kit", "Trousse d’alchimiste", "Trousse d'alchimiste"];

// Occult Philosophy, Brewmaster: with the brewmaster's book at hand, a potion takes half the time.
export const RECIPE_REFERENCE_NAMES = ["Recipe Reference", "Référence de recette"];

export const CRAFTING_TIME = { fr: "Au choix du MJ, en général entre deux aventures", en: "GM's call, usually between adventures" };
