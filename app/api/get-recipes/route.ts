import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

export async function POST(request: Request) {
  try {
    const { foodItem, location } = await request.json();
    
    if (!foodItem) {
      return NextResponse.json(
        { error: '需要食材信息' },
        { status: 400 }
      );
    }
    
    // Get user's city from IP if not provided
    let userLocation = location || '未知';
    if (!location) {
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          userLocation = `${ipData.city || ''}, ${ipData.region || ''}, ${ipData.country_name || ''}`;
        }
      } catch (error) {
        console.error('Error getting location from IP:', error);
      }
    }
    
    // Call OpenAI API to get a single recipe recommendation based on food and location
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `我在${userLocation}，有一些${foodItem}。请推荐一道适合我所在地区的美味食谱。
          
          请考虑我所在地区的饮食习惯和口味偏好，只推荐一道最适合的食谱。
          
          请用中文回答，并按照以下JSON格式返回响应：
          {
            "recipes": [
              {
                "id": "recipe-1",
                "name": "食谱名称",
                "description": "简短推荐语（不超过30个字）",
                "regionRelevance": "简短说明为什么这道菜适合我所在的地区"
              }
            ]
          }`
        }
      ],
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    
    const recipesText = response.choices[0]?.message?.content || "{}";
    
    try {
      const recipes = JSON.parse(recipesText);
      return NextResponse.json(recipes);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return NextResponse.json({ 
        error: '无法解析食谱结果',
        rawResponse: recipesText
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error getting recipes:', error);
    return NextResponse.json(
      { error: '获取食谱失败' },
      { status: 500 }
    );
  }
}