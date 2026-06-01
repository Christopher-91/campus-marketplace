import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import styles from "./MyOrders.module.css";

export default function MyOrders() {
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState("buying");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/orders/my"), api.get("/orders/sales")])
      .then(([purchaseRes, salesRes]) => {
        setPurchases(purchaseRes.data);
        setSales(salesRes.data);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Unable to load orders.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading orders...</div>;

  const orders = activeTab === "buying" ? purchases : sales;
  const emptyText = activeTab === "buying" ? "No purchases yet." : "No purchase requests yet.";

  return (
    <div className={styles.container}>
      <h1>My Orders</h1>
      <div className={styles.tabs}>
        <button
          className={activeTab === "buying" ? styles.activeTab : ""}
          onClick={() => setActiveTab("buying")}
        >
          Buying ({purchases.length})
        </button>
        <button
          className={activeTab === "selling" ? styles.activeTab : ""}
          onClick={() => setActiveTab("selling")}
        >
          Selling ({sales.length})
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>{emptyText}</p>
          <Link to="/">Start shopping →</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <div key={order.order_id} className={styles.order}>
              <div className={styles.orderImage}>
                {order.image_url ? (
                  <img src={order.image_url} alt={order.title} />
                ) : <div className={styles.noImg}>📦</div>}
              </div>
              <div className={styles.orderInfo}>
                <h3>{order.title}</h3>
                <p>{order.category}</p>
                <p className={styles.price}>₹{order.price.toLocaleString()}</p>
                {activeTab === "buying" ? (
                  <p>Seller: {order.seller_name} · {order.seller_email}</p>
                ) : (
                  <p>Buyer: {order.buyer_name} · {order.buyer_email}</p>
                )}
              </div>
              <div className={styles.orderMeta}>
                <span className={`${styles.status} ${order.status === "Pending" ? styles.pending : styles.done}`}>
                  {order.status}
                </span>
                <span className={styles.date}>
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
