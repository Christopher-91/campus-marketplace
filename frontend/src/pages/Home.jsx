import { useState, useEffect, useCallback } from "react";
import api from "../api";
import ProductCard from "../components/ProductCard";
import styles from "./Home.module.css";

const CATEGORIES = ["", "Books", "Electronics", "Furniture", "Clothing", "Lab Equipment", "Other"];
const CONDITIONS = ["", "Like New", "Good", "Fair", "Heavily Used"];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Debounce: wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9, search: debouncedSearch };
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await api.get("/products", { params });
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, condition, maxPrice, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const activeFilters = [category, condition, maxPrice].filter(Boolean).length;

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Buy & Sell on <span>Campus</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Textbooks, electronics, furniture — find great deals from fellow students
          </p>
          <div className={styles.heroSearch}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search for textbooks, calculators, furniture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>📚</span>
              <span className={styles.statLabel}>Books</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>💻</span>
              <span className={styles.statLabel}>Electronics</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>🪑</span>
              <span className={styles.statLabel}>Furniture</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>🔬</span>
              <span className={styles.statLabel}>Lab Gear</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Filters</h2>
            {activeFilters > 0 && (
              <span className={styles.filterCount}>{activeFilters}</span>
            )}
          </div>

          <div className={styles.filterGroup}>
            <label>Category</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c || "All Categories"}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Condition</label>
            <select value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c || "Any Condition"}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Max Price (₹)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            />
          </div>

          <button className={styles.clearBtn} onClick={() => {
            setCategory(""); setCondition(""); setMaxPrice(""); setSearch(""); setPage(1);
          }}>
            ✕ Clear Filters
          </button>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📦</div>
              <h3>No products found</h3>
              <p>Be the first to list something for your campus!</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {products.map((p, i) => (
                <div key={p.product_id} className={styles.gridItem} style={{ animationDelay: `${i * 0.06}s` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}