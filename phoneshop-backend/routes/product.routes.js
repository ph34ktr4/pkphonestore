const router = require('express').Router();
const Product = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = String(path.parse(file.originalname).name || 'image')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .slice(0, 60);
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    cb(ok ? null : new Error('Only image uploads are allowed'), ok);
  }
});

function maybeUploadSingle(fieldName) {
  return (req, res, next) => {
    const ct = String(req.headers['content-type'] || '');
    if (ct.includes('multipart/form-data')) {
      return upload.single(fieldName)(req, res, next);
    }
    return next();
  };
}

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('categoryId', 'name description')
      .populate('brandId', 'name logo');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: String(err) });
  }
});

// GET product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name description')
      .populate('brandId', 'name logo');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Invalid product id', error: String(err) });
  }
});

// POST product
router.post('/', requireAuth, requireAdmin, maybeUploadSingle('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const categoryId = body.categoryId || body.category;
    const brandId = body.brandId || body.brand;
    const stockRaw = body.stock;

    if (!body.name) return res.status(400).json({ message: 'name is required' });
    if (body.price === undefined || body.price === null || body.price === '') {
      return res.status(400).json({ message: 'price is required' });
    }
    if (stockRaw === undefined || stockRaw === null || stockRaw === '') {
      return res.status(400).json({ message: 'stock is required' });
    }
    if (!categoryId) return res.status(400).json({ message: 'categoryId is required' });
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const price = Number(body.price);
    const stock = parseInt(String(stockRaw), 10);
    const discountPrice = body.discountPrice !== undefined && body.discountPrice !== '' ? Number(body.discountPrice) : undefined;
    const description = body.description ? String(body.description) : '';

    const status = stock > 0 ? 'available' : 'out_of_stock';

    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
    const product = new Product({
      name: String(body.name),
      price,
      stock,
      discountPrice,
      description,
      status,
      brandId,
      categoryId,
      image: imagePath,
      createdAt: new Date()
    });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create product', error: String(err) });
  }
});

// PUT product (update)
router.put('/:id', requireAuth, requireAdmin, maybeUploadSingle('image'), async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const body = req.body || {};
    const update = {};
    const unset = {};

    if (body.name !== undefined) update.name = String(body.name);

    if (body.price !== undefined && body.price !== null && body.price !== '') {
      update.price = Number(body.price);
    }

    if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
      update.stock = parseInt(String(body.stock), 10);
    }

    const categoryId = body.categoryId || body.category;
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      update.categoryId = categoryId;
    }

    const brandId = body.brandId || body.brand;
    if (brandId !== undefined && brandId !== null && brandId !== '') {
      update.brandId = brandId;
    }

    if (body.description !== undefined) {
      update.description = body.description ? String(body.description) : '';
    }

    if (body.discountPrice !== undefined) {
      if (body.discountPrice === '' || body.discountPrice === null) {
        unset.discountPrice = 1;
      } else {
        update.discountPrice = Number(body.discountPrice);
      }
    }

    if (req.file) {
      update.image = `/uploads/${req.file.filename}`;
    }

    const nextStock = update.stock !== undefined ? update.stock : existing.stock;
    if (nextStock !== undefined && nextStock !== null) {
      update.status = nextStock > 0 ? 'available' : 'out_of_stock';
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name description')
      .populate('brandId', 'name logo');

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update product', error: String(err) });
  }
});

// DELETE product
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete product', error: String(err) });
  }
});

module.exports = router;
