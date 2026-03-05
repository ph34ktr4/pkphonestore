const router = require('express').Router();
const Category = require('../models/Category');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories', error: String(err) });
  }
});

// POST category
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    const category = await Category.create({
      name: String(name),
      slug: slugify(name),
      description: String(description || '')
    });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create category', error: String(err) });
  }
});

module.exports = router;
