'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';

interface AnalysisResult {
  itemType: string;
  isFresh: boolean;
  summary: string;
  goodFeatures: string[];
  badFeatures: string[];
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
    startCamera();
  };

  const analyzeVegetable = async () => {
    if (!photo) return;
    
    setAnalyzing(true);
    
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
        itemType: '未知',
        isFresh: false,
        summary: '无法分析图片，请重试。',
        goodFeatures: [],
        badFeatures: [],
        error: '分析失败'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <h1 className="text-2xl font-bold mb-4">食材新鲜度检测</h1>
      
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
                  {error ? error : "拍照或从相册选择图片"}
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
            
            {/* Analysis result section */}
            {analysis && (
              <div className="p-4 bg-white dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <h2 className="font-bold text-lg mb-2">
                  {analysis.itemType} - {analysis.isFresh ? 
                    <span className="text-green-600">新鲜</span> : 
                    <span className="text-red-600">不新鲜</span>}
                </h2>
                <p className="text-sm mb-4">{analysis.summary}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Good features */}
                  <div>
                    <h3 className="font-semibold text-green-600 mb-2">新鲜特征:</h3>
                    <ul className="list-disc pl-5 text-sm">
                      {analysis.goodFeatures.map((feature, index) => (
                        <li key={`good-${index}`}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Bad features */}
                  <div>
                    <h3 className="font-semibold text-red-600 mb-2">不新鲜特征:</h3>
                    <ul className="list-disc pl-5 text-sm">
                      {analysis.badFeatures.map((feature, index) => (
                        <li key={`bad-${index}`}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
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
              
              <button
                onClick={analyzeVegetable}
                disabled={analyzing}
                className={`px-4 py-2 ${analyzing ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition`}
              >
                {analyzing ? '分析中...' : analysis ? '重新分析' : '分析新鲜度'}
              </button>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}