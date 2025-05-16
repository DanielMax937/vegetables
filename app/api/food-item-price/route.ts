import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { foodItem } = await request.json();
    
    if (!foodItem) {
      return NextResponse.json(
        { error: '需要食材名称' },
        { status: 400 }
      );
    }
    
    // First get the main page to find the latest price link
    const mainPageUrl = 'https://www.fengxian.gov.cn/fgw/jbsj/index.html';
    const mainPageResponse = await fetch(mainPageUrl);
    
    if (!mainPageResponse.ok) {
      throw new Error(`Failed to fetch main page: ${mainPageResponse.status}`);
    }
    
    const mainPageHtml = await mainPageResponse.text();
    
    // Extract all links from the page
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(mainPageHtml)) !== null) {
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

    // Sort links by the date in the URL
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

    // Fetch the latest price page
    const pricePageResponse = await fetch(latestPriceLink.url);
    
    if (!pricePageResponse.ok) {
      throw new Error(`Failed to fetch price page: ${pricePageResponse.status}`);
    }
    
    const pricePageHtml = await pricePageResponse.text();
    
    // Extract tables from the content
    const tables = extractTables(pricePageHtml);
    tables.forEach((item:any[])=> {
      item.forEach((price:any[])=> {
        price.shift()
        price = price.map((subItem: string)=> {
          return subItem.replace("&nbsp;", "");
        })
      })
    })
    console.log(tables)
    // Search for the food item in the tables
    const foodItemPrices = findFoodItemInTables(tables, foodItem);
    
    return NextResponse.json({
      success: true,
      foodItem: foodItem,
      prices: foodItemPrices,
      priceDate: extractDateFromUrl(latestPriceLink.url, true),
      priceSource: latestPriceLink.title,
      priceUrl: latestPriceLink.url
    });
  } catch (error) {
    console.error('Error fetching food item price:', error);
    return NextResponse.json({
      success: false,
      error: '获取食材价格信息失败'
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

// Helper function to find food item in tables
function findFoodItemInTables(tables: string[][][], foodItem: string): any[] {
  const results = [];
  const searchTerms = generateSearchTerms(foodItem);
  
  // Search through all tables
  for (const table of tables) {
    if (table.length < 2) continue; // Skip tables without headers
    
    const headers = table[0];
    const nameColumnIndex = findNameColumnIndex(headers);
    
    if (nameColumnIndex === -1) continue; // Skip if no name column found
    
    // Search for the food item in each row
    for (let i = 1; i < table.length; i++) {
      const row = table[i];
      if (row.length <= nameColumnIndex) continue;
      
      const itemName = row[nameColumnIndex];
      
      // Check if any search term matches the item name
      if (searchTerms.some(term => itemName.includes(term))) {
        const priceInfo = {
          name: itemName,
          data: {}
        };
        
        // Extract all other columns as potential price data
        for (let j = 0; j < headers.length; j++) {
          if (j !== nameColumnIndex && j < row.length) {
            priceInfo.data[headers[j]] = row[j];
          }
        }
        
        results.push(priceInfo);
      }
    }
  }
  
  return results;
}

// Helper function to find the column index that contains item names
function findNameColumnIndex(headers: string[]): number {
  const nameKeywords = ['品名', '名称', '商品', '食品', '蔬菜', '水果', '肉类'];
  
  for (let i = 0; i < headers.length; i++) {
    if (nameKeywords.some(keyword => headers[i].includes(keyword))) {
      return i;
    }
  }
  
  // If no specific name column found, assume the first column
  return headers.length > 0 ? 0 : -1;
}

// Helper function to generate search terms for the food item
function generateSearchTerms(foodItem: string): string[] {
  const terms = [foodItem];
  
  // Add common variations
  if (foodItem.endsWith('菜')) {
    terms.push(foodItem.slice(0, -1));
  } else {
    terms.push(foodItem + '菜');
  }
  
  // Handle specific cases
  switch (foodItem) {
    case '西红柿':
      terms.push('番茄');
      break;
    case '土豆':
      terms.push('马铃薯');
      break;
    case '茄子':
      terms.push('茄');
      break;
    case '胡萝卜':
      terms.push('萝卜');
      terms.push('胡萝');
      break;
    case '青椒':
      terms.push('辣椒');
      terms.push('菜椒');
      break;
  }
  
  return terms;
}