// Install dependencies:
// npm install express puppeteer swagger-jsdoc swagger-ui-express cors

const express = require('express');
const puppeteer = require('puppeteer');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
const swaggerApp = express();
const PORT = 3000;
const SWAGGER_PORT = 3001;

// Enable CORS for both apps
app.use(cors());
swaggerApp.use(cors());

// Parse JSON bodies
app.use(express.json());
swaggerApp.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NEPSE Data Scraper API',
      version: '1.0.0',
      description: 'API to scrape Nepal Stock Exchange (NEPSE) data',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: '/',
        description: 'Current server (use this for ngrok)'
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Local API server'
      }
    ]
  },
  apis: ['./server.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger at ROOT with enhanced options
const swaggerOptions2 = {
  swaggerOptions: {
    persistAuthorization: true,
  }
};

swaggerApp.use('/', swaggerUi.serve);
swaggerApp.get('/', swaggerUi.setup(swaggerDocs, swaggerOptions2));

// Define API routes function
const setupRoutes = (application) => {
  /**
   * @swagger
   * /api/todays-price:
   *   get:
   *     summary: Get today's price data
   *     description: Scrapes today's price data from NEPSE website
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of records to return (default 50)
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       sn:
   *                         type: string
   *                         example: "1"
   *                       symbol:
   *                         type: string
   *                         example: "NABIL"
   *                       ltp:
   *                         type: string
   *                         example: "1250.00"
   *                       change:
   *                         type: string
   *                         example: "15.00"
   *                       percentChange:
   *                         type: string
   *                         example: "1.21%"
   *                       open:
   *                         type: string
   *                         example: "1235.00"
   *                       high:
   *                         type: string
   *                         example: "1260.00"
   *                       low:
   *                         type: string
   *                         example: "1230.00"
   *                       volume:
   *                         type: string
   *                         example: "15000"
   *                       previousClose:
   *                         type: string
   *                         example: "1235.00"
   *                       timestamp:
   *                         type: string
   *                         example: "2024-01-01T12:00:00.000Z"
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Error message"
   */
  application.get('/api/todays-price', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const data = await scrapeTodaysPrice(limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @swagger
   * /api/live-trading:
   *   get:
   *     summary: Get live trading data
   *     description: Scrapes live trading data from NEPSE
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of records to return (default 50)
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       symbol:
   *                         type: string
   *                         example: "NABIL"
   *                       ltp:
   *                         type: string
   *                         example: "1250.00"
   *                       change:
   *                         type: string
   *                         example: "15.00"
   *                       percentChange:
   *                         type: string
   *                         example: "1.21%"
   *                       volume:
   *                         type: string
   *                         example: "15000"
   *                       high:
   *                         type: string
   *                         example: "1260.00"
   *                       low:
   *                         type: string
   *                         example: "1230.00"
   *       500:
   *         description: Server error
   */
  application.get('/api/live-trading', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const data = await scrapeLiveTrading(limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @swagger
   * /api/top-gainers:
   *   get:
   *     summary: Get top gaining stocks
   *     description: Scrapes top gaining stocks from NEPSE
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       symbol:
   *                         type: string
   *                         example: "NABIL"
   *                       ltp:
   *                         type: string
   *                         example: "1250.00"
   *                       change:
   *                         type: string
   *                         example: "15.00"
   *                       percentChange:
   *                         type: string
   *                         example: "1.21%"
   *       500:
   *         description: Server error
   */
  application.get('/api/top-gainers', async (req, res) => {
    try {
      const data = await scrapeTopGainers();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Setup routes on both apps
setupRoutes(app);
setupRoutes(swaggerApp);

// Scraper functions
async function scrapeTodaysPrice(limit = 50) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox','--ignore-certificate-errors']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://www.nepalstock.com/today-price', {
      waitUntil: 'networkidle2',
      timeout: 70000
    });

    await page.waitForSelector('table', { timeout: 70000 });

    const priceData = await page.evaluate((limit) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.slice(0, limit).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          sn: cells[0]?.textContent.trim() || '',
          symbol: cells[1]?.textContent.trim() || '',
          ltp: cells[2]?.textContent.trim() || '',
          change: cells[3]?.textContent.trim() || '',
          percentChange: cells[4]?.textContent.trim() || '',
          open: cells[5]?.textContent.trim() || '',
          high: cells[6]?.textContent.trim() || '',
          low: cells[7]?.textContent.trim() || '',
          volume: cells[8]?.textContent.trim() || '',
          previousClose: cells[9]?.textContent.trim() || '',
          timestamp: new Date().toISOString()
        };
      });
    }, limit);

    return priceData;
  } finally {
    await browser.close();
  }
}

async function scrapeLiveTrading(limit = 50) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://www.nepalstock.com/live-trading', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('table', { timeout: 60000 });

    const tradingData = await page.evaluate((limit) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.slice(0, limit).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          symbol: cells[0]?.textContent.trim() || '',
          ltp: cells[1]?.textContent.trim() || '',
          change: cells[2]?.textContent.trim() || '',
          percentChange: cells[3]?.textContent.trim() || '',
          volume: cells[4]?.textContent.trim() || '',
          high: cells[5]?.textContent.trim() || '',
          low: cells[6]?.textContent.trim() || ''
        };
      });
    }, limit);

    return tradingData;
  } finally {
    await browser.close();
  }
}

async function scrapeTopGainers() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://www.nepalstock.com/top-ten/top-gainers', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('table', { timeout: 60000 });

    const gainersData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          symbol: cells[0]?.textContent.trim() || '',
          ltp: cells[1]?.textContent.trim() || '',
          change: cells[2]?.textContent.trim() || '',
          percentChange: cells[3]?.textContent.trim() || ''
        };
      });
    });

    return gainersData;
  } finally {
    await browser.close();
  }
}

// Start both servers
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});

swaggerApp.listen(SWAGGER_PORT, () => {
  console.log(`\n✅ Swagger + API available at http://localhost:${SWAGGER_PORT}`);
  console.log(`\n🌐 To make it accessible online:`);
  console.log(`   1. Run: ngrok http ${SWAGGER_PORT}`);
  console.log(`   2. Visit your ngrok URL directly`);
  console.log(`   3. Use the first server option (/) in the Swagger dropdown\n`);
});