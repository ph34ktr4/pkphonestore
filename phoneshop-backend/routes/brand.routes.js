const router = require('express').Router();
const Brand = require('../models/Brand');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET all brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch brands', error: String(err) });
  }
});

// POST brand (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, logo } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });

    const brand = await Brand.create({ name: String(name), logo: String(logo || '') });
    res.json(brand);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create brand', error: String(err) });
  }
});

module.exports = router;
