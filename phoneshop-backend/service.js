const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

if (!process.env.MONGO_URI) {
  throw new Error('Missing MONGO_URI in phoneshop-backend/.env (expected your phoneDB connection string)');
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const dbName = mongoose.connection?.name;
    console.log(`MongoDB connected${dbName ? ` (db: ${dbName})` : ''}`);
  })
  .catch(err => console.log(err));

app.use('/api/products', require('./routes/product.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/brands', require('./routes/brand.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/orders', require('./routes/order.routes'));

// Serve Angular build (optional). This fixes page refresh/deep-link routing in production.
// Build output for Angular 17+ is usually: ../dist/<project>/browser
const distBrowserPath = path.join(__dirname, '..', 'dist', 'phoneshop', 'browser');
const distLegacyPath = path.join(__dirname, '..', 'dist', 'phoneshop');
const clientPath = fs.existsSync(distBrowserPath) ? distBrowserPath : (fs.existsSync(distLegacyPath) ? distLegacyPath : null);

if (clientPath) {
  app.use(express.static(clientPath));

  // SPA fallback (must be after API routes)
  // Express 5 + path-to-regexp no longer supports a bare '*' string route.
  // Use a regex that matches everything except API and uploads.
  app.get(/^(?!\/api(?:\/|$))(?!\/uploads\/).*/, (req, res, next) => {

    const indexPath = path.join(clientPath, 'index.html');
    if (!fs.existsSync(indexPath)) return next();
    return res.sendFile(indexPath);
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
