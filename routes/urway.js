const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const TERMINAL_ID = 'hawana';
const PASSWORD = 'URWAY@123';
const MERCHANT_KEY = '3221be3889f129a49498983e6c49512b59136a9036208c07caec0749e1ab0023';

// Localhost testing URLs — update for production
const RETURN_URL = 'http://localhost:3000/payment-success';
const ERROR_URL = 'http://localhost:3000/payment-failure';

// Generate HMAC SHA256 hash (required by URWAY)
const generateRequestHash = ({ trackid, amount }) => {
  const stringToHash = `${trackid}|${TERMINAL_ID}|${PASSWORD}|1|SAR|SA|${amount}|${MERCHANT_KEY}`;
  return crypto.createHmac('sha256', MERCHANT_KEY).update(stringToHash).digest('hex');
};

// POST /urway/pay
router.post('/pay', async (req, res) => {
  try {
    const {
      amount,
      card_number,
      exp_month,
      exp_year,
      cvv,
      card_holder,
      user_id,
      order_id,
    } = req.body;

    if (!amount || !card_number || !exp_month || !exp_year || !cvv || !card_holder) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trackid = `ORD-${Date.now()}`;
    const requestHash = generateRequestHash({ trackid, amount });

    const payload = {
      terminalId: TERMINAL_ID,
      password: PASSWORD,
      action: '1', // always 1 for purchase
      currency: 'SAR',
      country: 'SA',
      amount,
      trackid,
      card: card_number,
      cvv,
      expYear: exp_year,
      expMonth: exp_month,
      cardHolder: card_holder,
      customerEmail: 'test@example.com', // optional
      customerIp: req.ip || '127.0.0.1',
      requestHash,
      returnUrl: RETURN_URL,
      errorUrl: ERROR_URL,
    };

    const urwayRes = await axios.post(
      'https://payments-dev.urway-tech.com/URWAYPGService/transaction/jsonProcess/JSONrequest',
      payload
    );

    return res.json(urwayRes.data);
  } catch (err) {
    console.error('[URWAY Error]', err.response?.data || err.message);
    return res.status(500).json({ error: 'URWAY payment request failed' });
  }
});

module.exports = router;
