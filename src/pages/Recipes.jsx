import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

export default function Recipes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState([{ liquid: "", amountMl: "" }]);
  const [saving, setSaving] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // ── Fetch recipes from Firestore on mount ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const recipesRef = collection(db, "users", user.uid, "recipes");
    
    const unsubscribe = onSnapshot(recipesRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recipes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ── Filter recipes by search query ────────────────────────────────────────
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return recipes;
    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(normalized)
    );
  }, [query, recipes]);

  // ── Handle ingredient input changes ───────────────────────────────────────
  const handleIngredientChange = (idx, field, value) => {
    const updated = [...ingredients];
    updated[idx][field] = field === "amountMl" ? Number(value) || "" : value;
    setIngredients(updated);
  };

  // ── Add new ingredient row ────────────────────────────────────────────────
  const addIngredient = () => {
    setIngredients([...ingredients, { liquid: "", amountMl: "" }]);
  };

  // ── Remove ingredient row ─────────────────────────────────────────────────
  const removeIngredient = (idx) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  // ── Save recipe to Firestore ──────────────────────────────────────────────
  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      alert("Recipe name is required.");
      return;
    }

    const validIngredients = ingredients
      .filter((ing) => ing.liquid.trim() && ing.amountMl !== "" && ing.amountMl !== 0)
      .map((ing) => ({
        liquid: ing.liquid.trim(),
        amountMl: Number(ing.amountMl),
      }));
    
    if (!validIngredients.length) {
      alert("Add at least one ingredient with a name and amount.");
      return;
    }

    setSaving(true);
    try {
      const recipesRef = collection(db, "users", user.uid, "recipes");
      await addDoc(recipesRef, {
        name: recipeName.trim(),
        createdAt: serverTimestamp(),
        ingredients: validIngredients,
      });

      // Reset form and close modal
      setRecipeName("");
      setIngredients([{ liquid: "", amountMl: "" }]);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving recipe:", error);
      alert("Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel modal ──────────────────────────────────────────────────────────
  const handleCancelModal = () => {
    setRecipeName("");
    setIngredients([{ liquid: "", amountMl: "" }]);
    setShowModal(false);
  };

  // ── Handle recipe card click ──────────────────────────────────────────────
  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
    setShowDetailsModal(true);
  };

  // ── Delete recipe from Firestore ───────────────────────────────────────────
  const handleDeleteRecipe = async (recipeId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "recipes", recipeId));
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert("Failed to delete recipe.");
    }
  };

  // ── Dispense recipe ────────────────────────────────────────────────────────
  const handleDispense = () => {
    navigate("/dispense", { state: { recipe: selectedRecipe } });
    setShowDetailsModal(false);
  };

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

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)" }}>
            Loading recipes...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)" }}>
            {query ? "No recipes match your search." : "No recipes yet. Create one!"}
          </div>
        ) : (
          <div className="recipe-grid">
            {filtered.map((recipe) => (
              <article
                key={recipe.id}
                className="card recipe-card anim-fade-in"
                onClick={() => handleRecipeClick(recipe)}
                style={{ cursor: "pointer", position: "relative" }}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteRecipe(recipe.id, e)}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "var(--color-muted)",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "var(--color-danger)")}
                  onMouseLeave={(e) => (e.target.style.color = "var(--color-muted)")}
                  title="Delete recipe"
                >
                  🗑️
                </button>

                <h3>{recipe.name}</h3>
                <ul>
                  {recipe.ingredients?.map((ing, idx) => (
                    <li key={idx}>
                      {ing.liquid} — {ing.amountMl} mL
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className="btn primary"
        onClick={() => setShowModal(true)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 700,
          padding: 0,
          zIndex: 100,
        }}
      >
        +
      </button>

      {/* Create Recipe Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => handleCancelModal()}
        >
          <div
            className="card anim-pop"
            style={{
              width: "min(500px, 90vw)",
              padding: 32,
              background: "var(--color-surface)",
              borderRadius: 12,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Create New Recipe</h2>

            {/* Recipe Name Input */}
            <label className="field">
              Recipe Name
              <input
                type="text"
                className="input"
                placeholder="e.g. Margarita"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
              />
            </label>

            {/* Ingredients List */}
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Ingredients</h3>
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label className="field" style={{ marginBottom: 0 }}>
                      Liquid
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. tequila"
                        value={ing.liquid}
                        onChange={(e) => handleIngredientChange(idx, "liquid", e.target.value)}
                      />
                    </label>
                  </div>
                  <div style={{ width: 120 }}>
                    <label className="field" style={{ marginBottom: 0 }}>
                      Amount (mL)
                      <input
                        type="number"
                        className="input"
                        placeholder="50"
                        value={ing.amountMl}
                        onChange={(e) => handleIngredientChange(idx, "amountMl", e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="btn ghost"
                    onClick={() => removeIngredient(idx)}
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add Ingredient Button */}
            <button
              className="btn ghost"
              onClick={addIngredient}
              style={{ marginBottom: 24, width: "100%" }}
            >
              + Add Ingredient
            </button>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn ghost"
                onClick={handleCancelModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleSaveRecipe}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Recipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Details Modal */}
      {showDetailsModal && selectedRecipe && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="card anim-pop"
            style={{
              width: "min(500px, 90vw)",
              padding: 32,
              background: "var(--color-surface)",
              borderRadius: 12,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{selectedRecipe.name}</h2>

            {/* Ingredients List */}
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, color: "var(--color-primary)" }}>Ingredients</h3>
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        background: "var(--color-background)",
                        borderRadius: 6,
                        borderLeft: "4px solid var(--color-primary)",
                      }}
                    >
                      <strong>{ing.liquid}</strong> — {ing.amountMl} mL
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No ingredients.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn ghost"
                onClick={() => setShowDetailsModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleDispense}
              >
                Dispense
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
