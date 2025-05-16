import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

// Serper API key
const serperApiKey = process.env.SERPER_API_KEY;

export async function POST(request: Request) {
  try {
    const { recipeName } = await request.json();

    if (!recipeName) {
      return NextResponse.json(
        { error: '需要食谱名称' },
        { status: 400 }
      );
    }

    // Use Serper API to search for recipe
    const searchResults = await searchRecipeWithSerper(recipeName);

    // Check if we have xiachufang.com results
    const xiachufangUrl = findXiachufangUrl(searchResults);

    if (xiachufangUrl) {
      try {
        // Try to crawl xiachufang.com
        const recipeData = await crawlXiachufangRecipe(xiachufangUrl);
        return NextResponse.json({
          ...recipeData,
          source: xiachufangUrl
        });
      } catch (crawlError) {
        console.error('Error crawling xiachufang:', crawlError);
        // Fall back to LLM if crawling fails
      }
    }

    // If no xiachufang URL or crawling failed, use LLM to generate recipe
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `根据以下搜索结果，为"${recipeName}"整理一份详细的食谱指南。
          搜索结果: ${JSON.stringify(searchResults)}
          
          请用中文回答，并按照以下JSON格式返回响应：
          {
            "name": "食谱名称",
            "ingredients": ["原料1", "原料2", ...],
            "steps": ["步骤1", "步骤2", ...],
            "tips": ["小贴士1", "小贴士2", ...]
          }
          
          请确保步骤清晰、详细，并包含有用的烹饪小贴士。`
        }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const recipeDetailText = response.choices[0]?.message?.content || "{}";

    try {
      const recipeDetail = JSON.parse(recipeDetailText);
      return NextResponse.json(recipeDetail);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return NextResponse.json({
        error: '无法解析食谱详情',
        rawResponse: recipeDetailText
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error getting recipe details:', error);
    return NextResponse.json(
      { error: '获取食谱详情失败' },
      { status: 500 }
    );
  }
}

// Find xiachufang.com URL in search results
function findXiachufangUrl(searchResults: any): string | null {
  try {
    if (searchResults?.organic) {
      for (const result of searchResults.organic) {
        if (result.link && result.link.includes('xiachufang.com')) {
          return result.link;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding xiachufang URL:', error);
    return null;
  }
}

// Crawl xiachufang.com recipe using Firecrawl and LLM
async function crawlXiachufangRecipe(url: string) {
  try {
    // Use Firecrawl to get structured content
    const crawlResponse = await app.crawlUrl(url, {
      limit: 100,
      scrapeOptions: {
        formats: ['markdown', 'html'],
      }
    })

    if (!crawlResponse.success) {
      throw new Error(`Failed to crawl: ${crawlResponse.error}`)
    }

    const firecrawlData = crawlResponse.data[0].markdown;
    console.log(firecrawlData)
    // Use LLM to extract structured recipe data from Firecrawl result
    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `从下面的下厨房网页内容中提取食谱信息，包括名称、原料、步骤和小贴士。
          
          对于步骤，请同时提取每个步骤的图片URL（如果有）。
          
          网页内容:
          ${JSON.stringify(firecrawlData)}
          
          请用中文回答，并按照以下JSON格式返回响应：
          {
            "name": "食谱名称",
            "ingredients": ["原料1 用量1", "原料2 用量2", ...],
            "steps": [
              {"text": "步骤1描述", "imageUrl": "步骤1图片URL或null"},
              {"text": "步骤2描述", "imageUrl": "步骤2图片URL或null"},
              ...
            ],
            "tips": ["小贴士1", "小贴士2", ...]
          }`
        }
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const extractedDataText = llmResponse.choices[0]?.message?.content || "{}";

    try {
      const extractedData = JSON.parse(extractedDataText);

      // Format steps to include images
      const formattedSteps = extractedData.steps.map((step: any) => {
        if (step.imageUrl) {
          return `${step.text} [图片]`;
        }
        return step.text;
      });

      // Collect all step images
      const stepImages = extractedData.steps
        .filter((step: any) => step.imageUrl)
        .map((step: any) => step.imageUrl);

      // Get cover image from Firecrawl data if available
      let coverImageUrl = null;

      return {
        name: extractedData.name,
        imageUrl: coverImageUrl,
        ingredients: extractedData.ingredients,
        steps: formattedSteps,
        stepImages: stepImages,
        tips: extractedData.tips && extractedData.tips.length > 0 ? extractedData.tips : ["暂无小贴士"]
      };
    } catch (parseError) {
      console.error('Error parsing LLM extraction response:', parseError);

      // Fallback to basic extraction from Firecrawl data
      const name = '';
      const ingredients: any[] = [];
      const steps: any[] = [];
      const tips: any[] = [];

      return {
        name,
        imageUrl: null,
        ingredients,
        steps,
        tips: tips.length > 0 ? tips : ["暂无小贴士"]
      };
    }
  } catch (error) {
    console.error('Error crawling xiachufang recipe:', error);
    throw error;
  }
}

// Real Serper API implementation
async function searchRecipeWithSerper(recipeName: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        q: `${recipeName} 食谱 做法 步骤 site:xiachufang.com`,
        location: "China",
        gl: 'cn',
        hl: 'zh-cn',
        num: 5
      }])
    });

    if (!response.ok) {
      console.log(response)
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching with Serper:', error);
    // Return fallback data in case of error
    return {
      organic: [
        {
          title: `${recipeName}的做法`,
          snippet: `${recipeName}是一道美味的菜肴，主要原料包括...`,
          link: 'https://example.com/recipe'
        }
      ]
    };
  }
}