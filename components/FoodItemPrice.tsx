'use client';

import { useState, useEffect } from 'react';

interface FoodItemPriceProps {
  foodItem: string;
}

interface PriceInfo {
  name: string;
  data: Record<string, string>;
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

export default function FoodItemPrice({ foodItem }: FoodItemPriceProps) {
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!foodItem) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/food-item-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ foodItem }),
        });
        
        if (!response.ok) {
          throw new Error('获取价格数据失败');
        }
        
        const data = await response.json();
        setPriceData(data);
      } catch (err) {
        console.error('Error fetching price:', err);
        setError('无法加载价格数据');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrice();
  }, [foodItem]);

  if (loading) {
    return (
      <div className="mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-300">正在获取最新价格信息...</p>
      </div>
    );
  }

  if (error) {
    return null; // Don't show anything if there's an error
  }

  if (!priceData || !priceData.success || priceData.prices.length === 0) {
    return null; // Don't show anything if no price data
  }

  return (
    <div className="mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="text-sm font-semibold mb-2">最新市场价格</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-600">
              <th className="px-2 py-1 text-left">品名</th>
              {Object.keys(priceData.prices[0].data).map((key) => (
                <th key={key} className="px-2 py-1 text-left">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priceData.prices.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                <td className="px-2 py-1 font-medium">{item.name}</td>
                {Object.values(item.data).map((value, i) => (
                  <td key={i} className="px-2 py-1">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-2 text-right">
        <p className="text-xs text-gray-500">
          数据来源: {priceData.priceDate} {priceData.priceSource}
        </p>
        <Link 
          href="/prices" 
          className="text-xs text-blue-500 hover:underline"
        >
          查看完整价格表 →
        </Link>
      </div>
    </div>
  );
}