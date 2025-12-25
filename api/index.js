// Install dependencies:
// npm install express puppeteer swagger-jsdoc swagger-ui-express cors

const express = require('express');
const puppeteer = require('puppeteer');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();


// Enable CORS for both apps
app.use(cors());


// Parse JSON bodies
app.use(express.json());


// Simple cache with TTL
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
}

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


// Define API routes function
const setupRoutes = (application) => {
  /**
   * @swagger
   * /api/todays-price:
   *   get:
   *     summary: Get today's price data
   *     description: Scrapes ALL today's price data from NEPSE website
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Optional limit on number of records (omit for all data)
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
   *                 totalRecords:
   *                   type: integer
   *                   example: 250
   *       500:
   *         description: Server error
   */
  application.get('/api/todays-price', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const cacheKey = `todays-price-${limit || 'all'}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ 
          success: true, 
          data: cached, 
          totalRecords: cached.length,
          cached: true 
        });
      }

      const data = await scrapeTodaysPrice(limit);
      setCache(cacheKey, data);
      res.json({ success: true, data, totalRecords: data.length });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @swagger
   * /api/live-trading:
   *   get:
   *     summary: Get live trading data
   *     description: Scrapes ALL live trading data from NEPSE
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Optional limit on number of records (omit for all data)
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error
   */
  application.get('/api/live-trading', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const cacheKey = `live-trading-${limit || 'all'}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ 
          success: true, 
          data: cached, 
          totalRecords: cached.length,
          cached: true 
        });
      }

      const data = await scrapeLiveTrading(limit);
      setCache(cacheKey, data, 30000); // 30 seconds for live data
      res.json({ success: true, data, totalRecords: data.length });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @swagger
   * /api/top-gainers:
   *   get:
   *     summary: Get top gaining stocks
   *     description: Scrapes ALL top gaining stocks from NEPSE
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error
   */
  application.get('/api/top-gainers', async (req, res) => {
    try {
      const cacheKey = 'top-gainers';
      
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ 
          success: true, 
          data: cached, 
          totalRecords: cached.length,
          cached: true 
        });
      }

      const data = await scrapeTopGainers();
      setCache(cacheKey, data);
      res.json({ success: true, data, totalRecords: data.length });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @swagger
   * /api/floor-sheet:
   *   get:
   *     summary: Get floor sheet data
   *     description: Scrapes ALL floor sheet trading data from NEPSE
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Optional limit on number of records (omit for all data)
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error
   */
  application.get('/api/floor-sheet', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const cacheKey = `floor-sheet-${limit || 'all'}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ 
          success: true, 
          data: cached, 
          totalRecords: cached.length,
          cached: true 
        });
      }

      const data = await scrapeFloorSheet(limit);
      setCache(cacheKey, data);
      res.json({ success: true, data, totalRecords: data.length });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Setup routes on both apps
setupRoutes(app);


// Scraper functions - Modified to scrape ALL data
async function scrapeTodaysPrice(limit = null) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Loading today\'s price page...');
    await page.goto('https://www.nepalstock.com/today-price', {
      waitUntil: 'networkidle2',
      timeout: 70000
    });

    await page.waitForSelector('table', { timeout: 70000 });

    let allData = [];
    let pageCount = 1;
    const maxPages = 100; // Safety limit to prevent infinite loops

    while (pageCount <= maxPages) {
      console.log(`📊 Scraping today's price page ${pageCount}...`);

      const pageData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
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
      });

      if (pageData.length === 0) {
        console.log('No data found on this page, stopping...');
        break;
      }

      allData = allData.concat(pageData);
      console.log(`   ✓ Collected ${pageData.length} records (Total: ${allData.length})`);

      // If limit is set and reached, stop
      if (limit && allData.length >= limit) {
        console.log(`Limit of ${limit} reached`);
        break;
      }

      // Check for next button
      const nextButton = await page.$('a[rel="next"]:not(.disabled), .pagination-next:not(.disabled), .paginate_button.next:not(.disabled)');
      if (!nextButton) {
        console.log('No more pages available');
        break;
      }

      const isDisabled = await page.evaluate(el => {
        return el.classList.contains('disabled') || 
               el.getAttribute('aria-disabled') === 'true' ||
               el.hasAttribute('disabled');
      }, nextButton);
      
      if (isDisabled) {
        console.log('Next button is disabled, reached last page');
        break;
      }

      // Navigate to next page
      try {
        await nextButton.click();
        await page.waitForTimeout(2000); // Wait for page transition
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
      } catch (navError) {
        console.log(`Navigation issue: ${navError.message}, stopping...`);
        break;
      }

      pageCount++;
    }

    // Apply limit if specified
    if (limit) {
      allData = allData.slice(0, limit);
    }

    console.log(`✅ Total records scraped: ${allData.length}`);
    return allData;

  } catch (error) {
    console.error('Error scraping today\'s price:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeLiveTrading(limit = null) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Loading live trading page...');
    await page.goto('https://www.nepalstock.com/live-trading', {
      waitUntil: 'networkidle2',
      timeout: 70000
    });

    await page.waitForSelector('table', { timeout: 70000 });

    let allData = [];
    let pageCount = 1;
    const maxPages = 100;

    while(pageCount <= maxPages){
      console.log(`📊 Scraping live trading page ${pageCount}...`);

      const scrapedData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          return {
            symbol: cells[0]?.textContent.trim() || '',
            ltp: cells[1]?.textContent.trim() || '',
            change: cells[2]?.textContent.trim() || '',
            percentChange: cells[3]?.textContent.trim() || '',
            volume: cells[4]?.textContent.trim() || '',
            high: cells[5]?.textContent.trim() || '',
            low: cells[6]?.textContent.trim() || '',
            timestamp: new Date().toISOString()
          };
        });
      });

      if (scrapedData.length === 0) {
        console.log('No data found on this page, stopping...');
        break;
      }

      allData = allData.concat(scrapedData);
      console.log(`   ✓ Collected ${scrapedData.length} records (Total: ${allData.length})`);

      if (limit && allData.length >= limit) {
        console.log(`Limit of ${limit} reached`);
        break;
      }

      const nextButton = await page.$('a[rel="next"]:not(.disabled), .pagination-next:not(.disabled), .paginate_button.next:not(.disabled)');
      if(!nextButton) {
        console.log('No more pages available');
        break;
      }

      const isDisabled = await page.evaluate(el => {
        return el.classList.contains('disabled') || 
               el.getAttribute('aria-disabled') === 'true' ||
               el.hasAttribute('disabled');
      }, nextButton);
      
      if(isDisabled) {
        console.log('Next button is disabled, reached last page');
        break;
      }

      try {
        await nextButton.click();
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
      } catch (navError) {
        console.log(`Navigation issue: ${navError.message}, stopping...`);
        break;
      }

      pageCount++;
    }
    
    if (limit) {
      allData = allData.slice(0, limit);
    }

    console.log(`✅ Total records scraped: ${allData.length}`);
    return allData;

  } catch (error) {
    console.error('Error scraping live trading:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeTopGainers() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Loading top gainers page...');
    await page.goto('https://www.nepalstock.com/top-ten/top-gainers', {
      waitUntil: 'networkidle2',
      timeout: 70000
    });

    await page.waitForSelector('table', { timeout: 70000 });

    let allData = [];
    let pageCount = 1;
    const maxPages = 50;

    while(pageCount <= maxPages){
      console.log(`📊 Scraping top gainers page ${pageCount}...`);

      const gainersData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          return {
            symbol: cells[0]?.textContent.trim() || '',
            ltp: cells[1]?.textContent.trim() || '',
            change: cells[2]?.textContent.trim() || '',
            percentChange: cells[3]?.textContent.trim() || '',
            timestamp: new Date().toISOString()
          };
        });
      });

      if (gainersData.length === 0) {
        console.log('No data found on this page, stopping...');
        break;
      }

      allData = allData.concat(gainersData);
      console.log(`   ✓ Collected ${gainersData.length} records (Total: ${allData.length})`);

      const nextButton = await page.$('a[rel="next"]:not(.disabled), .pagination-next:not(.disabled), .paginate_button.next:not(.disabled)');
      if(!nextButton) {
        console.log('No more pages available');
        break;
      }

      const isDisabled = await page.evaluate(el => {
        return el.classList.contains('disabled') || 
               el.getAttribute('aria-disabled') === 'true' ||
               el.hasAttribute('disabled');
      }, nextButton);
      
      if(isDisabled) {
        console.log('Next button is disabled, reached last page');
        break;
      }

      try {
        await nextButton.click();
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
      } catch (navError) {
        console.log(`Navigation issue: ${navError.message}, stopping...`);
        break;
      }

      pageCount++;
    }
    
    console.log(`✅ Total records scraped: ${allData.length}`);
    return allData;
    
  } catch (error){
    console.error('Error scraping top gainers:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeFloorSheet(limit = null) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Loading floor sheet page...');
    await page.goto('https://www.nepalstock.com/floor-sheet', {
      waitUntil: 'domcontentloaded',
      timeout: 70000
    });

    // Wait a bit longer for dynamic content
    await page.waitForTimeout(3000);
    await page.waitForSelector('table', { timeout: 70000 });

    let allData = [];
    let pageCount = 1;
    let globalSerialNumber =1;
    const maxPages = 100;

    while(pageCount <= maxPages){
      console.log(`📊 Scraping floor sheet page ${pageCount}...`);

      const floorSheetData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          return {
            pageSn: cells[0]?.textContent.trim() || '',
            contractNo: cells[1]?.textContent.trim() || '',
            symbol: cells[2]?.textContent.trim() || '',
            buyerMemberId: cells[3]?.textContent.trim() || '',
            sellerMemberId: cells[4]?.textContent.trim() || '',
            quantity: cells[5]?.textContent.trim() || '',
            rate: cells[6]?.textContent.trim() || '',
            amount: cells[7]?.textContent.trim() || '',
            timestamp: new Date().toISOString()
          };
        });
      });
      
      if (floorSheetData.length === 0) {
        console.log('No data found on this page, stopping...');
        break;
      }

      const dataWithGlobalSn = floorSheetData.map(item => ({sn: globalSerialNumber++, ...item}));

      allData = allData.concat(floorSheetData);
      console.log(`   ✓ Collected ${floorSheetData.length} records (Total: ${allData.length})`);

      if (limit && allData.length >= limit) {
        console.log(`Limit of ${limit} reached`);
        break;
      }

      // Check for next button using JavaScript click (more reliable for AJAX pagination)
      const hasNext = await page.evaluate(() => {
        const nextBtn = document.querySelector('a[rel="next"], .pagination-next, .paginate_button.next, li.next a');
        if (!nextBtn) return false;
        
        const parentLi = nextBtn.closest('li');
        if (parentLi && parentLi.classList.contains('disabled')) return false;
        
        if (nextBtn.classList.contains('disabled') || 
            nextBtn.getAttribute('aria-disabled') === 'true' ||
            nextBtn.hasAttribute('disabled')) {
          return false;
        }
        
        return true;
      });

      if (!hasNext) {
        console.log('No more pages available or next button disabled');
        break;
      }

      // Click using JavaScript for AJAX-based pagination
      await page.evaluate(() => {
        const nextBtn = document.querySelector('a[rel="next"], .pagination-next, .paginate_button.next, li.next a');
        if (nextBtn) nextBtn.click();
      });

      // Wait for content to update
      await page.waitForTimeout(3000);
      
      // Verify that new content loaded
      const newRowCount = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
      });

      if (newRowCount === 0) {
        console.log('No rows found after navigation, stopping...');
        break;
      }

      pageCount++;
    }
    
    if (limit) {
      allData = allData.slice(0, limit);
    }

    console.log(`✅ Total records scraped: ${allData.length}`);
    return allData;

  } catch (error) {
    console.error('Error scraping floor sheet:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.get('/',(req,res) => {
  res.status(200).json({
    message: 'NEPSE Scraper API running on vercel',
    endpoints: [
      '/api/todays-price',
      '/api/live-trading',
      '/api/top-gainers',
      '/api/floor-sheet'
    ]
  });
});

module.exports = app;