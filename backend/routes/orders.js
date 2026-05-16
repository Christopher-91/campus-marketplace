const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const db = require("../db");
const auth = require("../middleware/auth");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/orders — buyer requests to purchase
router.post("/", auth, async (req, res) => {
  const { product_id } = req.body;

  const product = db
    .prepare(
      `SELECT p.*, u.college_email as seller_email, u.name as seller_name
       FROM products p JOIN users u ON p.seller_id = u.user_id
       WHERE p.product_id = ?`
    )
    .get(product_id);

  if (!product) return res.status(404).json({ error: "Product not found" });
  if (product.is_sold) return res.status(400).json({ error: "Already sold" });
  if (product.seller_id === req.user.user_id)
    return res.status(400).json({ error: "You cannot buy your own listing" });

  // Create order
  const result = db
    .prepare(
      "INSERT INTO orders (buyer_id, product_id, status) VALUES (?, ?, 'Pending')"
    )
    .run(req.user.user_id, product_id);

  // Mark product as sold
  db.prepare("UPDATE products SET is_sold = 1 WHERE product_id = ?").run(
    product_id
  );

  // Send email to seller
  try {
    await transporter.sendMail({
      from: `"Campus Marketplace" <${process.env.EMAIL_USER}>`,
      to: product.seller_email,
      subject: `Someone wants to buy your item: ${product.title}`,
      html: `
        <h2>Hi ${product.seller_name}!</h2>
        <p><strong>${req.user.name}</strong> (${req.user.email}) wants to buy your listing:</p>
        <h3>🛒 ${product.title} — ₹${product.price}</h3>
        <p>Please contact them at <a href="mailto:${req.user.email}">${req.user.email}</a> to arrange meetup on campus.</p>
        <br/>
        <p>— Campus Marketplace Team</p>
      `,
    });
  } catch (emailErr) {
    console.error("Email failed:", emailErr.message);
    // Don't fail the order just because email failed
  }

  res.status(201).json({ order_id: result.lastInsertRowid });
});

// GET /api/orders/my — buyer's order history
router.get("/my", auth, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, p.title, p.price, p.image_url, p.category
       FROM orders o JOIN products p ON o.product_id = p.product_id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user.user_id);

  res.json(orders);
});

module.exports = router;