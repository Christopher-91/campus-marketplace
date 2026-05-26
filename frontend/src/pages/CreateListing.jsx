import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "./CreateListing.module.css";

const CATEGORIES = ["Books", "Electronics", "Furniture", "Clothing", "Lab Equipment", "Other"];
const CONDITIONS = ["Like New", "Good", "Fair", "Heavily Used"];

export default function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: CATEGORIES[0], condition: CONDITIONS[0],
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (image) formData.append("image", image);

      const res = await api.post("/products", formData);
      navigate(`/product/${res.data.product_id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Create a Listing</h1>
        <p className={styles.subtitle}>List an item for sale on campus</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.imageUpload}>
            <label htmlFor="imageInput" className={styles.imageLabel}>
              {preview ? (
                <img src={preview} alt="Preview" className={styles.preview} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>📸</span>
                  <p>Click to upload photo</p>
                </div>
              )}
            </label>
            <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g. NCERT Physics Part 2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Price (₹) *</label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                min="1"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Condition *</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              placeholder="Describe your item — edition, defects, why selling, etc."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Uploading..." : "📤 Post Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}