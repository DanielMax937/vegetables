'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface RecipeDetail {
  name: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  error?: string;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Extract recipe name from URL parameter
  const recipeName = decodeURIComponent((params.id as string).replace(/-/g, ' '));
  
  useEffect(() => {
    const fetchRecipeDetail = async () => {
      try {
        const response = await fetch('/api/recipe-detail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipeName }),
        });
        
        if (!response.ok) {
          throw new Error('获取食谱详情失败');
        }
        
        const data = await response.json();
        setRecipe(data);
      } catch (err) {
        console.error('Error fetching recipe details:', err);
        setError('无法加载食谱详情，请重试。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipeDetail();
  }, [recipeName]);
  
  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <Link 
          href="/" 
          className="text-blue-500 hover:underline mb-4 inline-block"
        >
          ← 返回主页
        </Link>
        
        <h1 className="text-2xl font-bold mb-6">{recipeName}</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : recipe ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{recipe.name}</h2>
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">所需原料</h3>
                <ul className="list-disc pl-5">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={`ing-${index}`} className="mb-1">{ingredient}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">烹饪步骤</h3>
                <ol className="list-decimal pl-5">
                  {recipe.steps.map((step, index) => (
                    <li key={`step-${index}`} className="mb-3">{step}</li>
                  ))}
                </ol>
              </div>
              
              {recipe.tips && recipe.tips.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">烹饪小贴士</h3>
                  <ul className="list-disc pl-5">
                    {recipe.tips.map((tip, index) => (
                      <li key={`tip-${index}`} className="mb-1">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            未找到食谱信息
          </div>
        )}
      </div>
    </div>
  );
}