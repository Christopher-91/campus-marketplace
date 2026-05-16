import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import styles from "./MyOrders.module.css";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders/my")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading orders...</div>;

  return (
    <div className={styles.container}>
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>No orders yet.</p>
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