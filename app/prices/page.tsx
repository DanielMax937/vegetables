'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceData {
  success: boolean;
  title: string;
  url: string;
  date: string;
  tables: string[][][];
  allLinks: {
    url: string;
    title: string;
  }[];
  error?: string;
}

export default function PricesPage() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/food-prices');
        
        if (!response.ok) {
          throw new Error('获取价格数据失败');
        }
        
        const data = await response.json();
        setPriceData(data);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('无法加载价格数据，请重试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="w-full max-w-4xl">
        <Link 
          href="/" 
          className="text-blue-500 hover:underline mb-4 inline-block"
        >
          ← 返回主页
        </Link>
        
        <h1 className="text-2xl font-bold mb-6">奉贤区食品价格信息</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : priceData && priceData.success ? (
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow mb-6">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">{priceData.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  发布日期: {priceData.date}
                </p>
                
                {priceData.tables.length > 0 ? (
                  <div>
                    {priceData.tables.length > 1 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {priceData.tables.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveTable(index)}
                            className={`px-3 py-1 text-sm rounded ${
                              activeTable === index 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            表格 {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            {priceData.tables[activeTable][0].map((header, index) => (
                              <th key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {priceData.tables[activeTable].slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">未找到价格表格数据</p>
                )}
                
                <div className="mt-4 text-right">
                  <a 
                    href={priceData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    查看原始页面 →
                  </a>
                </div>
              </div>
            </div>
            
            {priceData.allLinks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-3">历史价格信息</h3>
                  <ul className="space-y-2">
                    {priceData.allLinks.map((link, index) => (
                      <li key={index}>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            未找到价格信息
          </div>
        )}
      </div>
    </div>
  );
}