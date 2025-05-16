'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import FoodItemPrice from '../components/FoodItemPrice';

interface AnalysisResult {
  isFood?: boolean;
  message?: string;
  itemType?: string;
  isFresh?: boolean;
  summary?: string;
  goodFeatures?: string[];
  badFeatures?: string[];
  error?: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  regionRelevance?: string;
}

interface RecipeDetail {
  name: string;
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
  stepImages?: string[];
  tips: string[];
  source?: string;
  error?: string;
}

interface RecipesResponse {
  recipes: Recipe[];
  error?: string;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [recipeDetail, setRecipeDetail] = useState<RecipeDetail | null>(null);
  const [loadingRecipeDetail, setLoadingRecipeDetail] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
      }
    } catch (err) {
      setError('无法访问相机。请确保您已授予相机权限。');
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
        setAnalysis(null);
        setRecipes(null);
        setSelectedRecipe(null);
        setRecipeDetail(null);
      }
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhoto(e.target.result as string);
          setAnalysis(null);
          setRecipes(null);
          setSelectedRecipe(null);
          setRecipeDetail(null);
          if (cameraActive) {
            stopCamera();
          }
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setAnalysis(null);
    setRecipes(null);
    setSelectedRecipe(null);
    setRecipeDetail(null);
    startCamera();
  };

  const analyzeVegetable = async () => {
    if (!photo) return;
    
    setAnalyzing(true);
    setRecipes(null);
    setSelectedRecipe(null);
    setRecipeDetail(null);
    
    try {
      const response = await fetch('/api/analyze-vegetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: photo }),
      });
      
      if (!response.ok) {
        throw new Error('分析图片失败');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setAnalysis({
        isFood: false,
        message: '无法分析图片，请重试。',
        error: '分析失败'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getRecipes = async () => {
    if (!analysis?.itemType) return;
    
    setLoadingRecipes(true);
    
    try {
      // Try to get user's location
      let location = null;
      try {
        const locationResponse = await fetch('https://ipapi.co/json/');
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          location = `${locationData.city || ''}, ${locationData.region || ''}, ${locationData.country_name || ''}`;
        }
      } catch (locationError) {
        console.error('Error getting location:', locationError);
      }
      
      const response = await fetch('/api/get-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          foodItem: analysis.itemType,
          location: location
        }),
      });
      
      if (!response.ok) {
        throw new Error('获取食谱失败');
      }
      
      const data: RecipesResponse = await response.json();
      setRecipes(data.recipes);
    } catch (err) {
      console.error('Error getting recipes:', err);
      setError('获取食谱失败，请重试。');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const getRecipeDetail = async (recipeName: string) => {
    setSelectedRecipe(recipeName);
    setLoadingRecipeDetail(true);
    
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
      setRecipeDetail(data);
    } catch (err) {
      console.error('Error getting recipe details:', err);
      setError('获取食谱详情失败，请重试。');
    } finally {
      setLoadingRecipeDetail(false);
    }
  };

  const backToRecipes = () => {
    setSelectedRecipe(null);
    setRecipeDetail(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <h1 className="text-2xl font-bold mb-4">食材新鲜度检测</h1>
      {/* <Link 
        href="/prices" 
        className="text-sm text-blue-500 hover:underline mb-4"
      >
        查看最新菜价 →
      </Link> */}
      
      <div className="w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {!photo ? (
          <>
            <div className="relative aspect-[4/3] bg-black">
              {cameraActive ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  {error ? error : "拍照或从相册选择食材图片"}
                </div>
              )}
            </div>
            <div className="p-4 flex justify-center gap-4">
              {!cameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                  >
                    打开相机
                  </button>
                  <button
                    onClick={openFilePicker}
                    className="px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition"
                  >
                    从相册选择
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </>
              ) : (
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center"
                  aria-label="拍照"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500"></div>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Image section */}
            <div className="relative aspect-[4/3] bg-black">
              <img 
                src={photo} 
                alt="拍摄的照片" 
                className="w-full h-full object-cover" 
              />
            </div>
            
            {/* Recipe detail view */}
            {selectedRecipe && (
              <div className="p-4 bg-white dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">{selectedRecipe}</h2>
                  <button 
                    onClick={backToRecipes}
                    className="text-sm text-blue-500"
                  >
                    返回食谱列表
                  </button>
                </div>
                
                {loadingRecipeDetail ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : recipeDetail ? (
                  <div>
                    {recipeDetail.imageUrl && (
                      <div className="mb-4">
                        <img 
                          src={recipeDetail.imageUrl} 
                          alt={recipeDetail.name} 
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">所需原料</h3>
                      <ul className="list-disc pl-5">
                        {recipeDetail.ingredients.map((ingredient, index) => (
                          <li key={`ing-${index}`} className="mb-1">{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">烹饪步骤</h3>
                      <ol className="list-decimal pl-5">
                        {recipeDetail.steps.map((step, index) => (
                          <li key={`step-${index}`} className="mb-6">
                            <div className="mb-2">{step}</div>
                            {recipeDetail.stepImages && recipeDetail.stepImages[index] && (
                              <img 
                                src={recipeDetail.stepImages[index]} 
                                alt={`步骤${index + 1}`} 
                                className="w-full h-auto rounded-lg mb-2"
                              />
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    {recipeDetail.tips && recipeDetail.tips.length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg mb-2">烹饪小贴士</h3>
                        <ul className="list-disc pl-5">
                          {recipeDetail.tips.map((tip, index) => (
                            <li key={`tip-${index}`} className="mb-1">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* {recipeDetail.source && (
                      <div className="text-right text-xs text-gray-500 mt-4">
                        <a 
                          href={recipeDetail.source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          来源: 下厨房
                        </a>
                      </div>
                    )} */}
                  </div>
                ) : (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    未找到食谱信息
                  </div>
                )}
              </div>
            )}
            
            {/* Analysis result section */}
            {analysis && !selectedRecipe && (
              <div className="p-4 bg-white dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                {analysis.isFood === false ? (
                  <div className="text-center py-4">
                    <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
                    <p className="text-lg font-medium mb-2">非食材图片</p>
                    <p className="text-sm mb-4">{analysis.message}</p>
                    <p className="text-sm text-gray-600">请上传蔬菜、水果或肉类的图片</p>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold text-lg mb-2">
                      {analysis.itemType} - {analysis.isFresh ? 
                        <span className="text-green-600">新鲜</span> : 
                        <span className="text-red-600">不新鲜</span>}
                    </h2>
                    <p className="text-sm mb-4">{analysis.summary}</p>
                    
                    <FoodItemPrice foodItem={analysis.itemType!} />
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Good features */}
                      <div>
                        <h3 className="font-semibold text-green-600 mb-2">新鲜特征:</h3>
                        <ul className="list-disc pl-5 text-sm">
                          {analysis.goodFeatures?.map((feature, index) => (
                            <li key={`good-${index}`}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Bad features */}
                      <div>
                        <h3 className="font-semibold text-red-600 mb-2">不新鲜特征:</h3>
                        <ul className="list-disc pl-5 text-sm">
                          {analysis.badFeatures?.map((feature, index) => (
                            <li key={`bad-${index}`}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {analysis.isFood && analysis.isFresh && !recipes && (
                      <button
                        onClick={getRecipes}
                        disabled={loadingRecipes}
                        className={`w-full py-2 ${loadingRecipes ? 'bg-gray-400' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-lg transition mt-2`}
                      >
                        {loadingRecipes ? '获取食谱中...' : '获取推荐食谱'}
                      </button>
                    )}
                    
                    {/* Recipe recommendations */}
                    {recipes && recipes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-lg mb-3">推荐食谱</h3>
                        <ul className="space-y-3">
                          {recipes.map((recipe) => (
                            <li key={recipe.id} className="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg">
                              <div className="font-medium">{recipe.name}</div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{recipe.description}</p>
                              {recipe.regionRelevance && (
                                <p className="text-xs text-blue-600 dark:text-blue-300 mb-2">
                                  <span className="inline-block mr-1">📍</span>
                                  {recipe.regionRelevance}
                                </p>
                              )}
                              <button 
                                onClick={() => getRecipeDetail(recipe.name)}
                                className="text-sm text-blue-500 hover:underline"
                              >
                                查看详细做法 →
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="p-4 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={retakePhoto}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  重拍
                </button>
                <button
                  onClick={openFilePicker}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                >
                  重选
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              {!selectedRecipe && (
                <button
                  onClick={analyzeVegetable}
                  disabled={analyzing}
                  className={`px-4 py-2 ${analyzing ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition`}
                >
                  {analyzing ? '分析中...' : analysis ? '重新分析' : '分析新鲜度'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}