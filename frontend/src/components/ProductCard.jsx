import { Link } from "react-router-dom";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.product_id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} />
        ) : (
          <div className={styles.noImage}>📦</div>
        )}
        <span className={styles.condition}>{product.condition}</span>
      </div>
      <div className={styles.info}>
        <h3>{product.title}</h3>
        <p className={styles.category}>{product.category}</p>
        <div className={styles.bottom}>
          <span className={styles.price}>₹{product.price.toLocaleString()}</span>
          <span className={styles.seller}>by {product.seller_name}</span>
        </div>
      </div>
    </Link>
  );
}