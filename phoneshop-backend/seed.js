const mongoose = require('mongoose');
require('dotenv').config();

const bcrypt = require('bcryptjs');

const Category = require('./models/Category');
const User = require('./models/User');
const Brand = require('./models/Brand');

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in environment (.env)');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected for seed (db: ${mongoose.connection.name})`);

  // Seed default admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@phoneshop.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        username: 'admin',
        email: adminEmail,
        password: adminPasswordHash,
        role: 'admin',
        status: 'active',
        createdAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  const categoryNames = ['Smartphones', 'Accessories', 'Tablets', 'Wearables'];
  // If a previous seed run created a category without a slug, it will block future inserts
  // because the DB has a unique index on { slug: 1 }.
  await Category.deleteMany({ slug: null });
  for (const name of categoryNames) {
    const slug = slugify(name);
    await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, slug, description: '' } },
      { new: true, upsert: true }
    );
  }

  const brandNames = ['Apple', 'Samsung', 'Google', 'Xiaomi'];
  for (const name of brandNames) {
    await Brand.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, logo: '', createdAt: new Date() } },
      { new: true, upsert: true }
    );
  }

  const categoryCount = await Category.countDocuments();
  const userCount = await User.countDocuments();
  const brandCount = await Brand.countDocuments();

  console.log(`Seeded. Users: ${userCount}, Categories: ${categoryCount}, Brands: ${brandCount}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
