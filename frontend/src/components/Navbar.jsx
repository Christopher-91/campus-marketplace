import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo}>
        🏫 CampusBazaar
      </Link>
      <div className={styles.links}>
        <Link to="/">Browse</Link>
        {user ? (
          <>
            <Link to="/sell">+ Sell</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/cart" className={styles.cartLink}>
              🛒 Cart{" "}
              {cart.length > 0 && (
                <span className={styles.badge}>{cart.length}</span>
              )}
            </Link>
            <span className={styles.userName}>Hi, {user.name.split(" ")[0]}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className={styles.registerBtn}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}