import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import styles from "./Cart.module.css";

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const total = cart.reduce((sum, p) => sum + p.price, 0);

  const handleCheckout = async () => {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      for (const product of cart) {
        await api.post("/orders", { product_id: product.product_id });
      }
      clearCart();
      setSuccessMsg("🎉 Orders placed! Sellers have been emailed. Check your campus inbox for meetup details.");
    } catch (err) {
      alert(err.response?.data?.error || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <div className={styles.successIcon}>✅</div>
          <h2>Order Placed!</h2>
          <p>{successMsg}</p>
          <Link to="/" className={styles.browseBtn}>Browse More Items</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div style={{ fontSize: "4rem" }}>🛒</div>
          <h2>Your cart is empty</h2>
          <Link to="/" className={styles.browseBtn}>Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Your Cart</h1>
      <div className={styles.layout}>
        <div className={styles.items}>
          {cart.map((product) => (
            <div key={product.product_id} className={styles.item}>
              <div className={styles.itemImage}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} />
                ) : (
                  <div className={styles.noImg}>📦</div>
                )}
              </div>
              <div className={styles.itemInfo}>
                <h3>{product.title}</h3>
                <p>{product.category} • {product.condition}</p>
                <p className={styles.itemPrice}>₹{product.price.toLocaleString()}</p>
              </div>
              <button className={styles.removeBtn} onClick={() => removeFromCart(product.product_id)}>
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <h2>Order Summary</h2>
          <div className={styles.summaryRow}>
            <span>Items ({cart.length})</span>
            <span>₹{total.toLocaleString()}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Delivery</span>
            <span className={styles.free}>FREE (Campus Pickup)</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>Total</span>
            <span>₹{total.toLocaleString()}</span>
          </div>
          <button className={styles.checkoutBtn} onClick={handleCheckout} disabled={loading}>
            {loading ? "Processing..." : "Checkout — Contact Sellers"}
          </button>
          <p className={styles.note}>
            Sellers will receive an email with your contact. Meet on campus to exchange.
          </p>
        </div>
      </div>
    </div>
  );
}