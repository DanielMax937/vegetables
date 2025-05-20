'use client';

import { useState, useEffect } from 'react';

interface FoodItemPriceProps {
  foodItem: string;
}

interface PriceInfo {
  name: string;
  data: Record<string, string>;
  medianPrice?: string;
}

interface PriceResponse {
  success: boolean;
  foodItem: string;
  prices: PriceInfo[];
  priceDate: string;
  priceSource: string;
  priceUrl: string;
  error?: string;
}

export default function FoodItemPrice({ priceData, loading }: any) {

  if (loading) {
    return (
      <div className="mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-300">正在获取最新价格信息...</p>
      </div>
    );
  }

  if (!priceData || !priceData.success || priceData.prices.length === 0) {
    return null; // Don't show anything if no price data
  }

  // Check if we have median price data
  // const hasMedianPrice = priceData.prices[0]?.medianPrice && Object.keys(priceData.prices[0].medianPrice).length > 0;

  return (
    <div className="mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="text-sm font-semibold mb-2">最新市场价格: {priceData.prices[0].medianPrice} 元/千克</h3>

      {/* {hasMedianPrice && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium">推荐参考价格:</p>
          {Object.entries().map(([key, value]) => (
            <p key={key} className="text-sm">
              <span className="font-medium">{key}:</span> {value}
            </p>
          ))}
        </div>
      )} */}


      <div className="mt-2 text-right">
        <p className="text-xs text-gray-500">
          数据来源: <a
            href={priceData.priceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            {priceData.priceSource}
          </a>
        </p>

      </div>
    </div>
  );
}