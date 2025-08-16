import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_HOST,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "需要图片数据" }, { status: 400 });
    }

    // Remove the data URL prefix to get just the base64 data
    const base64Image = image.split(",")[1];

    // Call OpenAI API to analyze the image
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `首先判断这张图片是否包含食物（蔬菜、水果或肉类）。
              如果不是食物图片，请返回以下JSON格式：
              {
                "isFood": false,
                "message": "这不是食物图片，请上传蔬菜、水果或肉类的图片进行新鲜度分析。"
              }
              
              如果是食物图片，请分析它具体是什么，是否新鲜，并按照以下JSON格式返回响应：
              {
                "isFood": true,
                "itemType": "青菜/苹果/猪肉/等",
                "isFresh": true/false,
                "summary": "简短的总体评估",
                "goodFeatures": ["特征1", "特征2", ...],
                "badFeatures": ["特征1", "特征2", ...]
              }
              
              例如，如果分析猪肉：
              - 好的特征可能包括："淡红色"，"肉质紧实有弹性"
              - 不好的特征可能包括："褐红色"，"肉质发暗不新鲜"
              
              请至少提供3个好的特征和3个不好的特征进行比较。`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0]?.message?.content || "{}";

    try {
      const analysis = JSON.parse(analysisText);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      return NextResponse.json(
        {
          error: "无法解析分析结果",
          rawResponse: analysisText,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json({ error: "分析图片失败" }, { status: 500 });
  }
}
