const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");

// Check if Cloudinary is properly configured (not using placeholder values)
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  !process.env.CLOUDINARY_CLOUD_NAME.startsWith("your_") &&
  !process.env.CLOUDINARY_API_KEY.startsWith("your_") &&
  !process.env.CLOUDINARY_API_SECRET.startsWith("your_");

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("✅ Cloudinary configured — images will upload to cloud");
} else {
  console.log("📁 Cloudinary not configured — images will be stored locally");
}

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage so we can handle both Cloudinary and local
const upload = multer({ storage: multer.memoryStorage() });

// Helper to upload buffer to Cloudinary
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "campus-marketplace" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// GET /api/products — with search, filter, pagination
router.get("/", (req, res) => {
  const {
    search = "",
    category = "",
    condition = "",
    minPrice = 0,
    maxPrice = 999999,
    page = 1,
    limit = 9,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT p.*, u.name as seller_name, u.college_email as seller_email
    FROM products p
    JOIN users u ON p.seller_id = u.user_id
    WHERE p.is_sold = 0
      AND p.price BETWEEN ? AND ?
      AND p.title LIKE ?
  `;
  const params = [
    parseFloat(minPrice),
    parseFloat(maxPrice),
    `%${search}%`,
  ];

  if (category) {
    query += " AND p.category = ?";
    params.push(category);
  }
  if (condition) {
    query += " AND p.condition = ?";
    params.push(condition);
  }

  const countQuery = query.replace(
    "SELECT p.*, u.name as seller_name, u.college_email as seller_email",
    "SELECT COUNT(*) as total"
  );
  const { total } = db.prepare(countQuery).get(...params);

  query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), offset);

  const products = db.prepare(query).all(...params);

  res.json({
    products,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
  });
});

// GET /api/products/:id
router.get("/:id", (req, res) => {
  const product = db
    .prepare(
      `SELECT p.*, u.name as seller_name, u.college_email as seller_email
       FROM products p
       JOIN users u ON p.seller_id = u.user_id
       WHERE p.product_id = ?`
    )
    .get(req.params.id);

  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// POST /api/products — protected
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, description, price, category, condition } = req.body;

    if (!title || !price || !category || !condition)
      return res.status(400).json({ error: "Missing required fields" });

    let image_url = null;
    if (req.file) {
      if (isCloudinaryConfigured) {
        try {
          image_url = await uploadToCloudinary(req.file.buffer);
        } catch (uploadErr) {
          console.error("Cloudinary upload failed:", uploadErr.message);
        }
      }
      // Fall back to local storage if Cloudinary isn't configured or failed
      if (!image_url) {
        const ext = path.extname(req.file.originalname) || ".jpg";
        const filename = crypto.randomUUID() + ext;
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        image_url = `http://localhost:${process.env.PORT || 5000}/uploads/${filename}`;
      }
    }

    const result = db
      .prepare(
        `INSERT INTO products (seller_id, title, description, price, category, condition, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.user_id,
        title,
        description,
        parseFloat(price),
        category,
        condition,
        image_url
      );

    res.status(201).json({ product_id: result.lastInsertRowid });
  } catch (err) {
    console.error("Create listing error:", err);
    res.status(500).json({ error: "Failed to create listing. Please try again." });
  }
});

// DELETE /api/products/:id — only seller can delete
router.delete("/:id", auth, (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE product_id = ?")
    .get(req.params.id);

  if (!product) return res.status(404).json({ error: "Product not found" });
  if (product.seller_id !== req.user.user_id)
    return res.status(403).json({ error: "Not your listing" });

  db.prepare("DELETE FROM products WHERE product_id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;