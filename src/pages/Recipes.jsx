import { useMemo, useState } from "react";

const SAMPLE_RECIPES = [
  {
    name: "Citrus Breeze",
    ingredients: ["2 oz gin", "1 oz grapefruit juice", "0.5 oz lime", "club soda"],
  },
  {
    name: "Velvet Cola",
    ingredients: ["2 oz spiced rum", "4 oz cola", "dash bitters", "lime wheel"],
  },
  {
    name: "Berry Orbit",
    ingredients: ["1.5 oz vodka", "1 oz cranberry", "1 oz strawberry puree"],
  },
  {
    name: "Golden Ginger",
    ingredients: ["2 oz bourbon", "1 oz ginger syrup", "lemon juice"],
  },
];

export default function Recipes() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SAMPLE_RECIPES;
    return SAMPLE_RECIPES.filter((recipe) =>
      recipe.name.toLowerCase().includes(normalized)
    );
  }, [query]);

  return (
    <section className="page recipes-page">
      <div className="container">
        <div className="card anim-slide-up">
          <h2>Recipes</h2>
          <p className="muted">Filter and browse ready-to-pour mixes.</p>
          <input
            className="input search-input"
            type="search"
            placeholder="Search by name..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <article key={recipe.name} className="card recipe-card anim-fade-in">
              <h3>{recipe.name}</h3>
              <ul>
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
