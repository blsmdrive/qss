require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for enabling CORS
app.use(cors());

// We need raw bodies for Stripe Webhook verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// Configure PostgreSQL connection pool
// Render provide DATABASE_URL in environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database table if it doesn't exist
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) UNIQUE,
        stock_count INTEGER NOT NULL
      )
    `);

    // Insert initial inventory of 50 for flint_card if it doesn't exist
    await pool.query(`
      INSERT INTO inventory (product_name, stock_count)
      VALUES ('flint_card', 50)
      ON CONFLICT (product_name) DO NOTHING
    `);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

initDb();

// --- API ROUTES ---

// 1. Get current inventory count
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT stock_count FROM inventory WHERE product_name = $1', ['flint_card']);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ stock: result.rows[0].stock_count });
  } catch (err) {
    console.error('Database error fetching inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Create Stripe Checkout Session
app.post('/api/checkout', async (req, res) => {
  try {
    // Check stock before allowing checkout
    const result = await pool.query('SELECT stock_count FROM inventory WHERE product_name = $1', ['flint_card']);
    const currentStock = result.rows[0]?.stock_count || 0;

    if (currentStock <= 0) {
      return res.status(400).json({ error: 'Sorry, the Flint Card is currently out of stock.' });
    }

    // Determine the base URL for success/cancel redirects
    const host = req.headers.origin || req.headers.host || 'http://localhost:5500';
    const domainURL = host.startsWith('http') ? host : `https://${host}`;

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Flint Card',
              description: 'The smart NFC card that reclaims your focus instantly.',
            },
            unit_amount: 2499, // $24.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${domainURL}/apps/flint-download.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domainURL}/apps/flint.html`,
      // Custom metadata to identify the product being purchased in the webhook
      metadata: {
        product_name: 'flint_card'
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// 3. Stripe Webhook (to safely decrement inventory on successful payment)
app.post('/api/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Check if what was bought was the Flint Card
    if (session.metadata && session.metadata.product_name === 'flint_card') {
      try {
        // Decrement stock by 1 safely
        await pool.query(`
          UPDATE inventory 
          SET stock_count = stock_count - 1 
          WHERE product_name = $1 AND stock_count > 0
        `, ['flint_card']);
        
        console.log(`Successfully decremented stock for payment ${session.id}`);
      } catch (dbErr) {
        console.error('Failed to update inventory in database after payment:', dbErr);
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

// 4. Admin route to manually set inventory (e.g. back to 0 or up to 50)
app.post('/api/admin/set-inventory', async (req, res) => {
  const { newCount, adminSecret } = req.body;

  // Protect this route from the public!
  if (adminSecret !== process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  if (typeof newCount !== 'number' || newCount < 0) {
      return res.status(400).json({ error: 'Invalid count. Must be 0 or higher.' });
  }

  try {
      await pool.query(`
          UPDATE inventory 
          SET stock_count = $1 
          WHERE product_name = 'flint_card'
      `, [newCount]);

      console.log(`Manually updated inventory to ${newCount}`);
      res.json({ success: true, newCount });
  } catch (err) {
      console.error('Failed to manually update inventory:', err);
      res.status(500).json({ error: 'Database update failed' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
