const FLIGHT_MS = 650;
const STAGGER_MS = 110;
const BOIL_MS = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Where the ingredients land: the surface of the brew, near the top of the cauldron.
function brewSurface(bench) {
  const rect = bench.querySelector("[data-craft-station]").getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.36 };
}

// A copy of the ingredient leaves its slot, arcs over and sinks into the cauldron.
function throwIngredient(img, target, index) {
  const from = img.getBoundingClientRect();
  const flyer = img.cloneNode();
  flyer.removeAttribute("data-craft-ingredient");
  flyer.classList.add("sodl-craft-flyer");
  Object.assign(flyer.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(flyer);
  const dx = target.x - (from.left + from.width / 2);
  const dy = target.y - (from.top + from.height / 2);
  const flight = flyer.animate([
    { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) rotate(200deg) scale(0.9)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) rotate(360deg) scale(0.25)`, opacity: 0 }
  ], { duration: FLIGHT_MS, delay: index * STAGGER_MS, easing: "ease-in", fill: "forwards" });
  return flight.finished.finally(() => flyer.remove());
}

async function boil(bench) {
  bench.classList.add("is-boiling");
  await wait(BOIL_MS);
}

// Crafting right away uses the ingredients up, so they go into the pot; a request only stirs it.
const BREWS = {
  immediate: async (bench) => {
    const target = brewSurface(bench);
    const ingredients = [...bench.querySelectorAll("[data-craft-ingredient]")];
    await Promise.all(ingredients.map((img, index) => throwIngredient(img, target, index)));
    await boil(bench);
  },
  request: boil
};

export async function playBrew(bench, mode) {
  if (!bench || prefersReducedMotion()) {
    return;
  }
  bench.classList.add("is-brewing");
  try {
    await BREWS[mode](bench);
  } finally {
    bench.classList.remove("is-brewing", "is-boiling");
  }
}
