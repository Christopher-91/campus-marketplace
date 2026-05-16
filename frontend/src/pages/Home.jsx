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

  return (
    <div className={styles.layout}>
      {/* Sidebar Filters */}
      <aside className={styles.sidebar}>
        <h2>Filters</h2>

        <label>Category</label>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || "All Categories"}</option>
          ))}
        </select>

        <label>Condition</label>
        <select value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c || "Any Condition"}</option>
          ))}
        </select>

        <label>Max Price (₹)</label>
        <input
          type="number"
          placeholder="e.g. 1000"
          value={maxPrice}
          onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
        />

        <button className={styles.clearBtn} onClick={() => {
          setCategory(""); setCondition(""); setMaxPrice(""); setSearch(""); setPage(1);
        }}>
          Clear Filters
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search for textbooks, calculators, furniture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loading}>Loading products...</div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>No products found. Be the first to list one!</div>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.product_id} product={p} />
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
  );
}