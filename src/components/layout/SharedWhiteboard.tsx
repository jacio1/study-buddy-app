"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { Eraser, Pen, Trash2, Square, Circle, Undo2, Redo2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: "pen" | "eraser";
};

type ShapeStroke = {
  id: string;
  type: "rect" | "circle";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
};

type ClearEvent = {
  type: "clear";
};

interface SharedWhiteboardProps {
  sessionId: string;
  userId: string;
}

export function SharedWhiteboard({ sessionId, userId }: SharedWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3B82F6");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser" | "rect" | "circle">("pen");
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentStrokeRef = useRef<{ points: { x: number; y: number }[]; tool: "pen" | "eraser" } | null>(null);
  const currentShapeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  
  const [strokes, setStrokes] = useState<(Stroke | ShapeStroke)[]>([]);
  const [redoStack, setRedoStack] = useState<(Stroke | ShapeStroke)[]>([]);

  const getBackgroundColor = () => {
    if (typeof window === 'undefined') return '#0B1121';
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return isDark ? '#0B1121' : '#F8FAFC';
  };

  // Функция для сохранения штриха с проверкой прав
  const saveStroke = async (strokeData: Stroke | ShapeStroke | ClearEvent) => {
    try {
      const { error: insertError } = await supabase
        .from("whiteboard_strokes")
        .insert([
          {
            session_id: sessionId,
            user_id: userId,
            stroke_data: strokeData
          }
        ]);
      
      if (insertError) {
        console.error("Error saving stroke:", insertError);
        setError("Ошибка сохранения: " + insertError.message);
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error("Exception saving stroke:", err);
      setError("Ошибка подключения к серверу");
      return false;
    }
  };

  // Подписка на штрихи других участников
  useEffect(() => {
    const channel = supabase
      .channel(`whiteboard-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whiteboard_strokes",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.user_id === userId) return;
          
          const newStroke = payload.new.stroke_data;
          
          if (newStroke.type === "clear") {
            setStrokes([]);
            setRedoStack([]);
            
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            if (canvas && ctx && isCanvasReady) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
          }
          
          setStrokes(prev => [...prev, newStroke]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId, isCanvasReady]);

  // Инициализация canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(setupCanvas);
        return;
      }
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      setIsCanvasReady(true);
    };

    const timer = setTimeout(() => {
      setupCanvas();
    }, 100);
    
    const handleResize = () => {
      if (!canvasRef.current || !ctxRef.current || !isCanvasReady) return;
      
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const rect = canvas.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) return;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      ctx.putImageData(imageData, 0, 0);
      ctxRef.current = ctx;
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [color, size, isCanvasReady]);

  // Отрисовка всех штрихов
  useEffect(() => {
    if (!isCanvasReady || !ctxRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const bgColor = getBackgroundColor();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
      if ("points" in stroke) {
        const { points, color, size, tool } = stroke;
        ctx.strokeStyle = tool === "eraser" ? bgColor : color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (points.length === 0) return;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
        }
      } else if ("type" in stroke && (stroke.type === "rect" || stroke.type === "circle")) {
        const { type, startX, startY, endX, endY, color, size } = stroke;
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        
        if (type === "rect") {
          const width = endX - startX;
          const height = endY - startY;
          ctx.strokeRect(startX, startY, width, height);
        } else if (type === "circle") {
          const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          ctx.beginPath();
          ctx.ellipse(startX, startY, radius, radius, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }, [strokes, isCanvasReady]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCanvasReady) return;
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    
    if (tool === "pen" || tool === "eraser") {
      currentStrokeRef.current = {
        points: [{ x, y }],
        tool: tool as "pen" | "eraser"
      };
      
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.strokeStyle = tool === "eraser" ? getBackgroundColor() : color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      currentShapeRef.current = { startX: x, startY: y, endX: x, endY: y };
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isCanvasReady) return;
    const { x, y } = getCoordinates(e);
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const bgColor = getBackgroundColor();
    
    if ((tool === "pen" || tool === "eraser") && currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ x, y });
      
      ctx.strokeStyle = tool === "eraser" ? bgColor : color;
      ctx.lineWidth = size;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if ((tool === "rect" || tool === "circle") && currentShapeRef.current) {
      currentShapeRef.current.endX = x;
      currentShapeRef.current.endY = y;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      strokes.forEach(stroke => {
        if ("points" in stroke) {
          const { points, color, size, tool } = stroke;
          ctx.strokeStyle = tool === "eraser" ? bgColor : color;
          ctx.lineWidth = size;
          
          if (points.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
          }
        } else if ("type" in stroke && (stroke.type === "rect" || stroke.type === "circle")) {
          const { type, startX, startY, endX, endY, color, size } = stroke;
          ctx.strokeStyle = color;
          ctx.lineWidth = size;
          
          if (type === "rect") {
            const width = endX - startX;
            const height = endY - startY;
            ctx.strokeRect(startX, startY, width, height);
          } else if (type === "circle") {
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            ctx.beginPath();
            ctx.ellipse(startX, startY, radius, radius, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
      
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      
      if (tool === "rect") {
        const width = x - currentShapeRef.current.startX;
        const height = y - currentShapeRef.current.startY;
        ctx.strokeRect(currentShapeRef.current.startX, currentShapeRef.current.startY, width, height);
      } else if (tool === "circle") {
        const radius = Math.sqrt(Math.pow(x - currentShapeRef.current.startX, 2) + Math.pow(y - currentShapeRef.current.startY, 2));
        ctx.beginPath();
        ctx.ellipse(currentShapeRef.current.startX, currentShapeRef.current.startY, radius, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = async () => {
    if (!isDrawing || !isCanvasReady) return;
    setIsDrawing(false);
    
    if ((tool === "pen" || tool === "eraser") && currentStrokeRef.current) {
      const stroke: Stroke = {
        id: `${Date.now()}-${Math.random()}`,
        points: currentStrokeRef.current.points,
        color: color,
        size: size,
        tool: currentStrokeRef.current.tool
      };
      
      setStrokes(prev => [...prev, stroke]);
      setRedoStack([]);
      
      await saveStroke(stroke);
      
      currentStrokeRef.current = null;
    } 
    else if ((tool === "rect" || tool === "circle") && currentShapeRef.current) {
      const shape: ShapeStroke = {
        id: `${Date.now()}-${Math.random()}`,
        type: tool as "rect" | "circle",
        startX: currentShapeRef.current.startX,
        startY: currentShapeRef.current.startY,
        endX: currentShapeRef.current.endX,
        endY: currentShapeRef.current.endY,
        color: color,
        size: size
      };
      
      setStrokes(prev => [...prev, shape]);
      setRedoStack([]);
      
      await saveStroke(shape);
      
      currentShapeRef.current = null;
    }
  };

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !isCanvasReady) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setRedoStack([]);
    
    await saveStroke({ type: "clear" });
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastStroke]);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const strokeToRedo = redoStack[redoStack.length - 1];
    setStrokes(prev => [...prev, strokeToRedo]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex gap-2 p-2 bg-muted rounded-lg flex-wrap items-center">
        <Button
          variant={tool === "pen" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("pen")}
          title="Кисть"
        >
          <Pen className="w-5 h-5" />
        </Button>
        
        <Button
          variant={tool === "eraser" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("eraser")}
          title="Ластик"
        >
          <Eraser className="w-5 h-5" />
        </Button>
        
        <Button
          variant={tool === "rect" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("rect")}
          title="Прямоугольник"
        >
          <Square className="w-5 h-5" />
        </Button>
        
        <Button
          variant={tool === "circle" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("circle")}
          title="Круг"
        >
          <Circle className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border border-border"
          title="Цвет"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{size}px</span>
          <input
            type="range"
            min={1}
            max={20}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24 accent-primary"
          />
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" onClick={undo} title="Отменить">
          <Undo2 className="w-5 h-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={redo} title="Повторить">
          <Redo2 className="w-5 h-5" />
        </Button>
        
        <Button variant="destructive" size="icon" onClick={clearCanvas} title="Очистить всё">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="bg-muted rounded-lg w-full h-full cursor-crosshair"
        style={{ minHeight: "500px", width: "100%", height: "calc(100% - 60px)" }}
      />
    </div>
  );
}