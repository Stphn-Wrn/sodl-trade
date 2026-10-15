export const ALL_STATIONS = "all";

export function searchable(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Every word typed must appear, so "anti tox" finds "Potion anti-toxine".
function contains(text, words) {
  const haystack = searchable(text);
  return words.every((word) => haystack.includes(word));
}

// A recipe is found by its name or by one of its ingredients; "via" names the ingredient
// that matched, so the player understands why a recipe with another name shows up.
export function matchRecipe(recipe, filter) {
  if (filter.station !== ALL_STATIONS && recipe.station !== filter.station) {
    return { visible: false, via: null };
  }
  if (filter.readyOnly && !recipe.ready) {
    return { visible: false, via: null };
  }
  const words = searchable(filter.text).split(/\s+/).filter(Boolean);
  if (words.length === 0 || contains(recipe.name, words)) {
    return { visible: true, via: null };
  }
  const via = recipe.ingredients.find((ingredient) => contains(ingredient, words));
  if (via) {
    return { visible: true, via };
  }
  return { visible: false, via: null };
}

// Recipes learned since the player last looked. Without any record yet (first visit),
// the recipes already there are not news.
export function unseenRecipeIds(knownIds, seenIds) {
  if (!seenIds) {
    return [];
  }
  return knownIds.filter((id) => !seenIds.includes(id));
}
