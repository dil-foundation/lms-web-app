import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eraser, 
  Download, 
  RotateCcw, 
  Palette,
  Square,
  Circle,
  Minus,
  MousePointer
} from 'lucide-react';

interface MathDrawingCanvasProps {
  questionId: string;
  onDrawingChange: (drawingData: string) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  initialDrawing?: string;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

export const MathDrawingCanvas: React.FC<MathDrawingCanvasProps> = ({
  questionId,
  onDrawingChange,
  disabled = false,
  width = 600,
  height = 400,
  initialDrawing
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInitializingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath>({
    points: [],
    color: '#000000',
    width: 2,
    tool: 'pen'
  });
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser' | 'line' | 'circle' | 'square'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedWidth, setSelectedWidth] = useState(2);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#800000',
    '#808080', '#C0C0C0'
  ];

  const lineWidths = [1, 2, 3, 4, 6, 8];

  // Load initial drawing if provided
  useEffect(() => {
    if (initialDrawing) {
      isInitializingRef.current = true;
      try {
        const drawingData = JSON.parse(initialDrawing);
        setPaths(drawingData.paths || []);
      } catch (error) {
        console.error('Error loading initial drawing:', error);
      } finally {
        // Reset the flag after a short delay to allow the paths state to update
        setTimeout(() => {
          isInitializingRef.current = false;
        }, 100);
      }
    }
  }, [initialDrawing]);

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all paths
    paths.forEach(path => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }, [paths]);

  // Save drawing when paths change (but only if there are paths and not initializing)
  useEffect(() => {
    if (paths.length > 0 && !isInitializingRef.current) {
      const drawingData = {
        paths,
        timestamp: new Date().toISOString(),
        questionId
      };
      onDrawingChange(JSON.stringify(drawingData));
    }
  }, [paths, questionId, onDrawingChange]);

  const getPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const point = getPoint(e);
    
    setIsDrawing(true);
    setCurrentPath({
      points: [point],
      color: selectedColor,
      width: selectedWidth,
      tool: selectedTool === 'eraser' ? 'eraser' : 'pen'
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    
    e.preventDefault();
    const point = getPoint(e);
    
    setCurrentPath(prev => ({
      ...prev,
      points: [...prev.points, point]
    }));

    // Draw immediately for smooth experience
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = selectedWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (currentPath.points.length > 0) {
      const lastPoint = currentPath.points[currentPath.points.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath.points.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath({
        points: [],
        color: selectedColor,
        width: selectedWidth,
        tool: selectedTool === 'eraser' ? 'eraser' : 'pen'
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPaths([]);
    // Call onDrawingChange directly for clear action
    onDrawingChange('');
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `math-drawing-${questionId}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tools */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tools:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={selectedTool === 'pen' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('pen')}
                  disabled={disabled}
                >
                  <MousePointer className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('eraser')}
                  disabled={disabled}
                >
                  <Eraser className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'line' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('line')}
                  disabled={disabled}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'circle' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('circle')}
                  disabled={disabled}
                >
                  <Circle className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'square' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('square')}
                  disabled={disabled}
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Color:</span>
              <div className="flex gap-1">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>

            {/* Line Width */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Width:</span>
              <div className="flex gap-1">
                {lineWidths.map(width => (
                  <button
                    key={width}
                    className={`w-8 h-6 rounded border ${
                      selectedWidth === width ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    onClick={() => setSelectedWidth(width)}
                    disabled={disabled}
                  >
                    {width}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={clearCanvas}
                disabled={disabled}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadDrawing}
                disabled={disabled}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cursor-crosshair bg-white dark:bg-gray-900"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>• Use the pen tool to draw mathematical diagrams, graphs, or geometric shapes</p>
        <p>• Use the eraser to correct mistakes</p>
        <p>• Your drawing will be automatically saved as you work</p>
      </div>
    </div>
  );
};