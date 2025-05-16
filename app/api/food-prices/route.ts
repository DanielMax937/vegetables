import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function GET() {
  try {
    // Crawl the main page to get all links
    const mainPageUrl = 'https://www.fengxian.gov.cn/fgw/jbsj/index.html';
    const crawlResponse = await app.crawlUrl(mainPageUrl, {
      limit: 100,
      scrapeOptions: {
        formats: ['html'],
      }
    });

    if (!crawlResponse.success) {
      throw new Error(`Failed to crawl main page: ${crawlResponse.error}`);
    }

    // Extract all links from the page
    const html = crawlResponse.data[0].html;
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].trim();
      
      // Look specifically for links in the format /fgw/jbsj/YYYYMMDD/xxxxx.html
      if (href.match(/\/fgw\/jbsj\/\d{8}\/\d+\.html/) && 
          (text.includes('价格') || 
          text.includes('物价') || 
          text.includes('市场'))) {
        
        // Convert relative URLs to absolute URLs
        const absoluteUrl = href.startsWith('http') 
          ? href 
          : `https://www.fengxian.gov.cn${href.startsWith('/') ? '' : '/'}${href}`;
        
        links.push({
          url: absoluteUrl,
          title: text
        });
      }
    }

    // Sort links by the date in the URL (format: /fgw/jbsj/YYYYMMDD/xxxxx.html)
    links.sort((a, b) => {
      const dateA = extractDateFromUrl(a.url);
      const dateB = extractDateFromUrl(b.url);
      
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });

    // Get the first link (latest food price)
    if (links.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到价格信息链接'
      });
    }

    const latestPriceLink = links[0];

    // Crawl the latest price page
    const pricePageResponse = await app.crawlUrl(latestPriceLink.url, {
      limit: 100,
      scrapeOptions: {
        formats: ['html', 'markdown'],
      }
    });

    if (!pricePageResponse.success) {
      throw new Error(`Failed to crawl price page: ${pricePageResponse.error}`);
    }

    // Extract price data
    const pricePageContent = pricePageResponse.data[0].markdown || pricePageResponse.data[0].html;
    
    // Extract tables from the content
    const tables = extractTables(pricePageResponse.data[0].html);

    return NextResponse.json({
      success: true,
      title: latestPriceLink.title,
      url: latestPriceLink.url,
      date: extractDateFromUrl(latestPriceLink.url, true),
      tables: tables,
      allLinks: links.slice(0, 10) // Return top 10 links
    });
  } catch (error) {
    console.error('Error fetching food prices:', error);
    return NextResponse.json({
      success: false,
      error: '获取食品价格信息失败'
    }, { status: 500 });
  }
}

// Helper function to extract date from URL
function extractDateFromUrl(url: string, asString: boolean = false): Date | string | null {
  // Look for pattern like /fgw/jbsj/20250516/89097.html
  const dateRegex = /\/fgw\/jbsj\/(\d{8})\//;
  const match = url.match(dateRegex);
  
  if (match) {
    const dateStr = match[1];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    if (asString) {
      return `${year}-${month}-${day}`;
    }
    
    return new Date(`${year}-${month}-${day}`);
  }
  
  return null;
}

// Helper function to extract tables from HTML
function extractTables(html: string): any[] {
  const tables = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[0];
    const rows = [];
    
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[0];
      const cells = [];
      
      // Extract cells (both th and td)
      const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/g;
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellContent = cellMatch[2].replace(/<[^>]+>/g, '').trim();
        cells.push(cellContent);
      }
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    
    if (rows.length > 0) {
      tables.push(rows);
    }
  }
  
  return tables;
}