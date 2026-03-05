const router = require('express').Router();

const Order = require('../models/Order');
const OrderDetail = require('../models/OrderDetail');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const ALLOWED_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'];

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({ message: 'Admin account cannot place orders' });
    }

    const { customer, items, payment } = req.body || {};

    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({ message: 'customer is required' });
    }

    const fullName = String(customer.fullName || '').trim();
    const phone = String(customer.phone || '').trim();
    const address = String(customer.address || '').trim();
    const note = String(customer.note || '').trim();

    if (!fullName || !phone || !address) {
      return res.status(400).json({ message: 'fullName, phone and address are required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    if (!payment || typeof payment !== 'object') {
      return res.status(400).json({ message: 'payment is required' });
    }

    const cardHolder = String(payment.cardHolder || '').trim();
    const last4 = String(payment.last4 || '').trim();
    const expMonth = toNumber(payment.expMonth);
    const expYear = toNumber(payment.expYear);

    if (!cardHolder) return res.status(400).json({ message: 'payment.cardHolder is required' });
    if (!/^[0-9]{4}$/.test(last4)) return res.status(400).json({ message: 'payment.last4 must be 4 digits' });
    if (!Number.isFinite(expMonth) || expMonth < 1 || expMonth > 12) {
      return res.status(400).json({ message: 'payment.expMonth must be 1-12' });
    }
    if (!Number.isFinite(expYear) || expYear < 2000) {
      return res.status(400).json({ message: 'payment.expYear must be a valid year' });
    }

    const normalizedItems = items.map((it) => {
      const productId = it.productId;
      const name = String(it.name || '').trim();
      const unitPrice = toNumber(it.unitPrice);
      const quantity = Math.trunc(toNumber(it.quantity));
      const image = it.image ? String(it.image) : '';

      return { productId, name, unitPrice, quantity, image };
    });

    for (const it of normalizedItems) {
      if (!it.productId) return res.status(400).json({ message: 'Each item must include productId' });
      if (!it.name) return res.status(400).json({ message: 'Each item must include name' });
      if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) {
        return res.status(400).json({ message: 'Each item must include a valid unitPrice' });
      }
      if (!Number.isFinite(it.quantity) || it.quantity < 1) {
        return res.status(400).json({ message: 'Each item must include a valid quantity' });
      }
    }

    const total = normalizedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    const [order] = await Order.insertMany(
      [
        {
          userId: req.user.sub,
          customer: { fullName, phone, address, note },
          items: normalizedItems,
          total,
          cancelRequest: { requested: false },
          status: 'pending',
          createdAt: new Date()
        }
      ],
      { bypassDocumentValidation: true }
    );

    const [details] = await OrderDetail.insertMany(
      [
        {
          orderId: order._id,
          userId: req.user.sub,
          customer: { fullName, phone, address, note },
          items: normalizedItems.map((it) => ({
            productId: it.productId,
            name: it.name,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            image: it.image || ''
          })),
          total,
          cancelRequest: { requested: false },
          status: order.status,
          payment: {
            cardHolder,
            last4,
            expMonth: Math.trunc(expMonth),
            expYear: Math.trunc(expYear)
          },
          createdAt: new Date()
        }
      ],
      { bypassDocumentValidation: true }
    );

    return res.status(201).json({
      _id: String(order._id),
      detailsId: String(details._id),
      status: order.status,
      total: order.total,
      createdAt: order.createdAt
    });
  } catch (err) {
    return res.status(500).json({ message: 'Create order failed', error: String(err) });
  }
});

// Authenticated customer can list their own orders
router.get('/my', requireAuth, async (req, res) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({ message: 'Admin account has no personal orders' });
    }
    const orders = await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'List my orders failed', error: String(err) });
  }
});

// Customer: request cancel while order is still pending
router.post('/:id/cancel-request', requireAuth, async (req, res) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({ message: 'Admin account cannot request cancellations' });
    }

    const id = req.params.id;
    const order = await Order.findOne({ _id: id, userId: req.user.sub });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }
    if (order.cancelRequest?.requested) {
      return res.status(400).json({ message: 'Cancel request already submitted' });
    }

    const now = new Date();
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          cancelRequest: { requested: true, requestedAt: now }
        }
      },
      { bypassDocumentValidation: true }
    );

    await OrderDetail.updateMany(
      { orderId: order._id, userId: req.user.sub },
      { $set: { cancelRequest: { requested: true, requestedAt: now } } },
      { bypassDocumentValidation: true }
    );

    return res.json({ ok: true, _id: String(order._id), cancelRequested: true });
  } catch (err) {
    return res.status(400).json({ message: 'Cancel request failed', error: String(err) });
  }
});

// Authenticated customer can remove their own pending order
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({ message: 'Admin account cannot remove orders' });
    }
    const id = req.params.id;

    const order = await Order.findOne({ _id: id, userId: req.user.sub });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be removed' });
    }

    await Order.deleteOne({ _id: order._id });
    await OrderDetail.deleteMany({ orderId: order._id, userId: req.user.sub });

    return res.json({ ok: true, _id: String(order._id) });
  } catch (err) {
    return res.status(400).json({ message: 'Remove order failed', error: String(err) });
  }
});

// Admin: update order status (confirm/complete)
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const status = String(req.body?.status || '').trim();
    if (!status) return res.status(400).json({ message: 'status is required' });
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const $set = { status };
    // If admin completes the order, clear any outstanding cancel request.
    if (status === 'completed') {
      $set.cancelRequest = {
        requested: false,
        handledAt: new Date(),
        decision: 'auto-cleared'
      };
    }

    const updated = await Order.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true, bypassDocumentValidation: true });
    if (!updated) return res.status(404).json({ message: 'Order not found' });

    // Keep order_details snapshot in sync for status only
    const detailSet = { status };
    if ($set.cancelRequest) detailSet.cancelRequest = $set.cancelRequest;
    await OrderDetail.updateMany({ orderId: updated._id }, { $set: detailSet }, { bypassDocumentValidation: true });

    return res.json({ ok: true, _id: String(updated._id), status: updated.status });
  } catch (err) {
    return res.status(400).json({ message: 'Update order status failed', error: String(err) });
  }
});

// Admin: approve a customer's cancel request (sets status to cancelled)
router.put('/:id/cancel-request/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }
    if (!order.cancelRequest?.requested) {
      return res.status(400).json({ message: 'No cancel request to approve' });
    }

    const now = new Date();
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'cancelled',
          cancelRequest: {
            requested: false,
            requestedAt: order.cancelRequest?.requestedAt || now,
            handledAt: now,
            decision: 'approved'
          }
        }
      },
      { bypassDocumentValidation: true }
    );

    await OrderDetail.updateMany(
      { orderId: order._id },
      {
        $set: {
          status: 'cancelled',
          cancelRequest: {
            requested: false,
            requestedAt: order.cancelRequest?.requestedAt || now,
            handledAt: now,
            decision: 'approved'
          }
        }
      },
      { bypassDocumentValidation: true }
    );

    return res.json({ ok: true, _id: String(order._id), status: 'cancelled' });
  } catch (err) {
    return res.status(400).json({ message: 'Approve cancel request failed', error: String(err) });
  }
});

// Admin: disapprove a customer's cancel request (keeps status pending)
router.put('/:id/cancel-request/disapprove', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be updated' });
    }
    if (!order.cancelRequest?.requested) {
      return res.status(400).json({ message: 'No cancel request to disapprove' });
    }

    const now = new Date();
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          cancelRequest: {
            requested: false,
            requestedAt: order.cancelRequest?.requestedAt || now,
            handledAt: now,
            decision: 'disapproved'
          }
        }
      },
      { bypassDocumentValidation: true }
    );

    await OrderDetail.updateMany(
      { orderId: order._id },
      {
        $set: {
          cancelRequest: {
            requested: false,
            requestedAt: order.cancelRequest?.requestedAt || now,
            handledAt: now,
            decision: 'disapproved'
          }
        }
      },
      { bypassDocumentValidation: true }
    );

    return res.json({ ok: true, _id: String(order._id), status: String(order.status) });
  } catch (err) {
    return res.status(400).json({ message: 'Disapprove cancel request failed', error: String(err) });
  }
});

// Optional: admin can list all orders
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'List orders failed', error: String(err) });
  }
});

module.exports = router;
