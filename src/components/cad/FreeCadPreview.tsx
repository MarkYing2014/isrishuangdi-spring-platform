"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Html } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// 缓存机制 - 保存生成的几何体，切换 Tab 后不需要重新生成
// ============================================================================

interface CacheEntry {
  geometry: THREE.BufferGeometry;
  timestamp: number;
}

// 全局缓存 (模块级别，组件卸载后仍然保留)
const geometryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟缓存有效期

function getCacheKey(springType: string, geometry: Record<string, unknown>): string {
  // 创建稳定的缓存键
  const key = JSON.stringify({ springType, geometry });
  return key;
}

function getCachedGeometry(key: string): THREE.BufferGeometry | null {
  const entry = geometryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.geometry;
  }
  // 清理过期缓存
  if (entry) {
    geometryCache.delete(key);
  }
  return null;
}

function setCachedGeometry(key: string, geometry: THREE.BufferGeometry): void {
  geometryCache.set(key, { geometry, timestamp: Date.now() });
  
  // 限制缓存大小 (最多保留 5 个)
  if (geometryCache.size > 5) {
    const oldestKey = geometryCache.keys().next().value;
    if (oldestKey) {
      geometryCache.delete(oldestKey);
    }
  }
}

/** 清除所有缓存 */
export function clearGeometryCache(): void {
  geometryCache.clear();
  console.log("[FreeCadPreview] Cache cleared");
}

// ============================================================================

interface FreeCadPreviewProps {
  springType: "compression" | "extension" | "torsion" | "conical";
  geometry: {
    wireDiameter: number;
    meanDiameter?: number;
    outerDiameter?: number;
    activeCoils: number;
    totalCoils?: number;
    freeLength?: number;
    bodyLength?: number;
    hookType?: string;
    legLength1?: number;
    legLength2?: number;
    windingDirection?: "left" | "right";
    largeOuterDiameter?: number;
    smallOuterDiameter?: number;
  };
  className?: string;
}

interface PreviewState {
  status: "idle" | "loading" | "success" | "error" | "unavailable" | "cached";
  message?: string;
  geometry?: THREE.BufferGeometry;
}

/**
 * STL 模型渲染组件
 */
function STLModel({ geometry }: { geometry: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 计算缩放因子使模型适合视图
  const scale = useMemo(() => {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (!bbox) return 1;
    
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // 目标大小约 30 单位
    const targetSize = 30;
    const scaleFactor = maxDim > 0 ? targetSize / maxDim : 1;
    
    console.log("[STLModel] Size:", size, "Scale:", scaleFactor);
    return scaleFactor;
  }, [geometry]);
  
  // 自动旋转
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  
  return (
    <Center>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        scale={[scale, scale, scale]}
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial
          color="#4a90d9"
          metalness={0.7}
          roughness={0.3}
          envMapIntensity={1}
        />
      </mesh>
    </Center>
  );
}

/**
 * 加载状态显示 - 带倒计时
 */
function LoadingOverlay({ message, estimatedTime = 15 }: { message: string; estimatedTime?: number }) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const remaining = Math.max(0, estimatedTime - elapsed);
  const progress = Math.min(100, (elapsed / estimatedTime) * 100);
  
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-white bg-black/70 px-6 py-4 rounded-lg min-w-[200px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-medium">{message}</span>
        
        {/* 进度条 */}
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* 时间显示 */}
        <div className="text-xs text-gray-300">
          {remaining > 0 ? (
            <span>预计剩余 ~{remaining} 秒</span>
          ) : (
            <span>即将完成...</span>
          )}
          <span className="ml-2 text-gray-400">({elapsed}s)</span>
        </div>
      </div>
    </Html>
  );
}

/**
 * 场景设置
 */
function SceneSetup() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}

/**
 * FreeCAD 3D 预览组件
 * 
 * 调用后端 FreeCAD API 生成真正的 CAD 模型并在浏览器中预览
 */
export function FreeCadPreview({
  springType,
  geometry,
  className = "",
}: FreeCadPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 计算缓存键
  const cacheKey = useMemo(() => getCacheKey(springType, geometry), [springType, geometry]);
  
  // 组件挂载时检查缓存
  useEffect(() => {
    const cached = getCachedGeometry(cacheKey);
    if (cached) {
      setState({ status: "cached", geometry: cached });
    }
  }, [cacheKey]);
  
  const loadPreview = useCallback(async (forceRefresh = false) => {
    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedGeometry(cacheKey);
      if (cached) {
        setState({ status: "cached", geometry: cached });
        return;
      }
    }
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState({ status: "loading", message: "Generating CAD model..." });
    
    try {
      const response = await fetch("/api/freecad/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ springType, geometry }),
        signal: abortControllerRef.current.signal,
      });
      
      const result = await response.json();
      
      if (result.status === "unavailable") {
        setState({ status: "unavailable", message: result.message });
        return;
      }
      
      if (result.status !== "success") {
        setState({ status: "error", message: result.message || "Failed to generate preview" });
        return;
      }
      
      // 解析 STL 数据
      console.log("[FreeCadPreview] Received data length:", result.data?.length);
      
      const stlData = atob(result.data);
      const stlBuffer = new ArrayBuffer(stlData.length);
      const stlView = new Uint8Array(stlBuffer);
      for (let i = 0; i < stlData.length; i++) {
        stlView[i] = stlData.charCodeAt(i);
      }
      
      console.log("[FreeCadPreview] STL buffer size:", stlBuffer.byteLength);
      
      // 加载 STL
      const loader = new STLLoader();
      const stlGeometry = loader.parse(stlBuffer);
      stlGeometry.computeVertexNormals();
      
      // 计算边界框
      stlGeometry.computeBoundingBox();
      const bbox = stlGeometry.boundingBox;
      console.log("[FreeCadPreview] Geometry bounding box:", bbox);
      console.log("[FreeCadPreview] Vertex count:", stlGeometry.attributes.position?.count);
      
      // 保存到缓存
      setCachedGeometry(cacheKey, stlGeometry);
      
      setState({ status: "success", geometry: stlGeometry });
      
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setState({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }, [springType, geometry, cacheKey]);
  
  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      {/* 控制按钮 */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => loadPreview(state.status === "success" || state.status === "cached")}
          disabled={state.status === "loading"}
          className="bg-white/90 hover:bg-white"
        >
          {state.status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-1">
            {state.status === "idle" ? "Generate CAD Preview" : "Refresh"}
          </span>
        </Button>
      </div>
      
      {/* 状态指示器 */}
      {state.status !== "idle" && state.status !== "loading" && (
        <div className="absolute top-2 left-2 z-10">
          {(state.status === "success" || state.status === "cached") && (
            <div className="flex items-center gap-1 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
              <CheckCircle className="w-3 h-3" />
              <span>{state.status === "cached" ? "Cached" : "FreeCAD Model"}</span>
            </div>
          )}
          {state.status === "error" && (
            <div className="flex items-center gap-1 bg-red-500/90 text-white px-2 py-1 rounded text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>Error</span>
            </div>
          )}
          {state.status === "unavailable" && (
            <div className="flex items-center gap-1 bg-amber-500/90 text-white px-2 py-1 rounded text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>FreeCAD Not Installed</span>
            </div>
          )}
        </div>
      )}
      
      {/* 3D 画布 */}
      <Canvas
        shadows
        camera={{ position: [50, 30, 50], fov: 50 }}
        className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg"
      >
        <SceneSetup />
        
        {/* 灯光 */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-10, 10, -10]} intensity={0.5} />
        
        {/* 环境 */}
        <Environment preset="studio" />
        
        {/* 模型或占位符 */}
        {(state.status === "success" || state.status === "cached") && state.geometry ? (
          <STLModel geometry={state.geometry} />
        ) : state.status === "loading" ? (
          <LoadingOverlay message="正在生成 CAD 模型..." estimatedTime={60} />
        ) : state.status === "idle" ? (
          <Html center>
            <div className="text-center text-white/70 px-4">
              <p className="text-sm">Click "Generate CAD Preview" to create</p>
              <p className="text-xs mt-1">a real CAD model using FreeCAD</p>
            </div>
          </Html>
        ) : state.status === "error" || state.status === "unavailable" ? (
          <Html center>
            <div className="text-center text-white/70 px-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm">{state.message}</p>
            </div>
          </Html>
        ) : null}
        
        {/* 控制器 */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={200}
        />
        
        {/* 网格地面 */}
        <gridHelper args={[100, 20, "#444", "#333"]} position={[0, -20, 0]} />
      </Canvas>
      
      {/* 底部提示 */}
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <p className="text-xs text-white/50">
          {state.status === "success" || state.status === "cached"
            ? `Real CAD geometry from FreeCAD${state.status === "cached" ? " (cached)" : ""} • Drag to rotate • Scroll to zoom`
            : "Preview will show actual CAD model generated by FreeCAD"
          }
        </p>
      </div>
    </div>
  );
}

export default FreeCadPreview;
