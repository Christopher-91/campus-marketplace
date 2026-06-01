const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const db = require("../db");
const auth = require("../middleware/auth");

function getEmailConfig() {
  return {
    user: (process.env.EMAIL_USER || "").trim(),
    pass: (process.env.EMAIL_PASS || "").trim(),
  };
}

// Check if email is properly configured
const emailConfig = getEmailConfig();
const isEmailConfigured =
  emailConfig.user &&
  emailConfig.pass &&
  !emailConfig.user.startsWith("your_") &&
  !emailConfig.pass.startsWith("your_");

let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });
  console.log("✅ Email configured — seller notifications will be sent");
} else {
  console.log("📧 Email not configured — seller notifications will be skipped (update EMAIL_USER and EMAIL_PASS in .env)");
}

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

  const createOrder = db.transaction(() => {
    const result = db
      .prepare(
        "INSERT INTO orders (buyer_id, product_id, status) VALUES (?, ?, 'Pending')"
      )
      .run(req.user.user_id, product_id);

    db.prepare("UPDATE products SET is_sold = 1 WHERE product_id = ?").run(
      product_id
    );

    return result;
  });

  const result = createOrder();
  let emailStatus = {
    configured: Boolean(transporter),
    sent: false,
    status: transporter ? "pending" : "not_configured",
    recipient: product.seller_email,
  };

  // Send email to seller
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Campus Marketplace" <${emailConfig.user}>`,
        to: product.seller_email,
        replyTo: req.user.email,
        subject: `Someone wants to buy your item: ${product.title}`,
        text: [
          `Hi ${product.seller_name},`,
          "",
          `${req.user.name} wants to buy your listing: ${product.title}`,
          `Price: ₹${product.price}`,
          "",
          `Contact the buyer at ${req.user.email} to arrange a campus meetup.`,
          "",
          "Campus Marketplace Team",
        ].join("\n"),
        html: `
          <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0a0a1a; color: #f0f0f5; border-radius: 16px;">
            <h2 style="margin: 0 0 16px; color: #ffffff;">Hi ${product.seller_name}! 🎉</h2>
            <p style="color: #8888a8; line-height: 1.6;">
              <strong style="color: #f0f0f5;">${req.user.name}</strong> wants to buy your listing:
            </p>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px; color: #ffffff;">${product.title}</h3>
              <p style="margin: 0; font-size: 1.4rem; font-weight: 800; background: linear-gradient(135deg, #ff6b6b, #e94560); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">₹${product.price}</p>
            </div>
            <p style="color: #8888a8; line-height: 1.6;">
              Contact the buyer at <a href="mailto:${req.user.email}" style="color: #e94560; text-decoration: none; font-weight: 600;">${req.user.email}</a> to arrange a campus meetup.
            </p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
            <p style="color: #5a5a7a; font-size: 0.85rem;">— Campus Marketplace Team</p>
          </div>
        `,
      });
      console.log(`📧 Email sent to seller ${product.seller_email} for product "${product.title}"`);
      emailStatus = {
        ...emailStatus,
        sent: true,
        status: "sent",
      };
    } catch (emailErr) {
      console.error("📧 Email failed:", emailErr.message);
      emailStatus = {
        ...emailStatus,
        status: "failed",
      };
    }
  } else {
    console.log(`📧 Email skipped (not configured) — would have notified ${product.seller_email} about "${product.title}"`);
  }

  res.status(201).json({ order_id: result.lastInsertRowid, email: emailStatus });
});

// GET /api/orders/my — buyer's order history
router.get("/my", auth, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, p.title, p.price, p.image_url, p.category,
              s.name AS seller_name, s.college_email AS seller_email
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN users s ON p.seller_id = s.user_id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user.user_id);

  res.json(orders);
});

// GET /api/orders/sales — seller's received purchase requests
router.get("/sales", auth, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, p.title, p.price, p.image_url, p.category,
              b.name AS buyer_name, b.college_email AS buyer_email
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN users b ON o.buyer_id = b.user_id
       WHERE p.seller_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user.user_id);

  res.json(orders);
});

module.exports = router;
