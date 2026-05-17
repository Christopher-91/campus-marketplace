import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import styles from "./ProductDetail.module.css";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!product) return null;

  const inCart = cart.some((p) => p.product_id === product.product_id);
  const isOwner = user?.email === product.seller_email;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.imageSection}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} />
          ) : (
            <div className={styles.noImage}>📦</div>
          )}
        </div>

        <div className={styles.details}>
          <span className={styles.category}>{product.category}</span>
          <h1>{product.title}</h1>
          <p className={styles.price}>₹{product.price.toLocaleString()}</p>

          <div className={styles.badges}>
            <span className={styles.badge}>🔖 {product.condition}</span>
            {product.is_sold ? (
              <span className={`${styles.badge} ${styles.sold}`}> Sold</span>
            ) : (
              <span className={`${styles.badge} ${styles.available}`}> Available</span>
            )}
          </div>

          <p className={styles.description}>{product.description || "No description provided."}</p>

          <div className={styles.seller}>
            <span>👤</span>
            <div>
              <p className={styles.sellerName}>{product.seller_name}</p>
              <p className={styles.sellerEmail}>{product.seller_email}</p>
            </div>
          </div>

          {!product.is_sold && !isOwner && (
            <button
              className={`${styles.cartBtn} ${inCart ? styles.added : ""}`}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                addToCart(product);
              }}
            >
              {inCart ? "Added to Cart" : "🛒 Add to Cart"}
            </button>
          )}

          {isOwner && (
            <p className={styles.ownerNote}>This is your listing.</p>
          )}
        </div>
      </div>
    </div>
  );
}