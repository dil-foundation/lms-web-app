import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Square, 
  ArrowUp, 
  Divide, 
  X, 
  Plus, 
  Minus,
  Circle,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  PenTool,
  Type
} from 'lucide-react';
import { MathDrawingCanvas } from './MathDrawingCanvas';
// import { validateMathExpression } from '@/utils/mathEvaluation';

interface MathExpressionInputProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showValidation?: boolean;
  expectedAnswer?: string;
  tolerance?: number;
  hint?: string;
  allowDrawing?: boolean;
  drawingData?: string;
  onDrawingChange?: (drawingData: string) => void;
}

export const MathExpressionInput: React.FC<MathExpressionInputProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  showValidation = false,
  expectedAnswer,
  tolerance = 0.01,
  hint,
  allowDrawing = false,
  drawingData = '',
  onDrawingChange
}) => {
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validate expression when value changes
  useEffect(() => {
    if (value && showValidation) {
      // Simple validation for now - just check if not empty
      const isValid = value.trim().length > 0;
      setIsValid(isValid);
      setValidationError(isValid ? '' : 'Expression cannot be empty');
    } else {
      setIsValid(true);
      setValidationError('');
    }
  }, [value, showValidation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const insertMathSymbol = (symbol: string) => {
    if (disabled) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + symbol + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const insertMathCommand = (command: string) => {
    if (disabled) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = value.substring(0, start) + command.replace('{}', `{${selectedText}}`) + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position inside the braces
    const cursorPos = start + command.indexOf('{') + 1;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos + selectedText.length);
    }, 0);
  };

  const mathSymbols = [
    { symbol: '+', label: 'Plus', icon: Plus },
    { symbol: '-', label: 'Minus', icon: Minus },
    { symbol: '\\times', label: 'Times', icon: X },
    { symbol: '\\div', label: 'Divide', icon: Divide },
    { symbol: '=', label: 'Equals' },
    { symbol: '\\neq', label: 'Not Equal' },
    { symbol: '<', label: 'Less Than' },
    { symbol: '>', label: 'Greater Than' },
    { symbol: '\\leq', label: 'Less or Equal' },
    { symbol: '\\geq', label: 'Greater or Equal' },
    { symbol: '\\pm', label: 'Plus Minus' },
    { symbol: '\\mp', label: 'Minus Plus' },
  ];

  const mathCommands = [
    { command: '\\frac{}{}', label: 'Fraction', icon: Divide },
    { command: '\\sqrt{}', label: 'Square Root', icon: Square },
    { command: '^{}', label: 'Superscript', icon: ArrowUp },
    { command: '_{}', label: 'Subscript' },
    { command: '\\sin()', label: 'Sine' },
    { command: '\\cos()', label: 'Cosine' },
    { command: '\\tan()', label: 'Tangent' },
    { command: '\\log()', label: 'Logarithm' },
    { command: '\\ln()', label: 'Natural Log' },
    { command: '\\exp()', label: 'Exponential' },
  ];

  const greekLetters = [
    { symbol: '\\alpha', label: 'Alpha (α)' },
    { symbol: '\\beta', label: 'Beta (β)' },
    { symbol: '\\gamma', label: 'Gamma (γ)' },
    { symbol: '\\delta', label: 'Delta (δ)' },
    { symbol: '\\epsilon', label: 'Epsilon (ε)' },
    { symbol: '\\theta', label: 'Theta (θ)' },
    { symbol: '\\lambda', label: 'Lambda (λ)' },
    { symbol: '\\mu', label: 'Mu (μ)' },
    { symbol: '\\pi', label: 'Pi (π)', icon: Circle },
    { symbol: '\\sigma', label: 'Sigma (σ)' },
    { symbol: '\\tau', label: 'Tau (τ)' },
    { symbol: '\\phi', label: 'Phi (φ)' },
    { symbol: '\\omega', label: 'Omega (ω)' },
    { symbol: '\\infty', label: 'Infinity (∞)', icon: Hash },
  ];

  return (
    <div className="space-y-4">
      {/* Main input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mathematical Expression
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={disabled}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            {showValidation && (
              <Badge 
                variant={isValid ? "default" : "destructive"}
                className="text-xs"
              >
                {isValid ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valid
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Invalid
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>

        {allowDrawing ? (
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text Input
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Drawing
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={handleInputChange}
                  placeholder="Enter your mathematical expression using LaTeX notation..."
                  disabled={disabled}
                  className="w-full min-h-[100px] resize-none border-none outline-none bg-transparent text-lg font-mono"
                  style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="drawing" className="space-y-4">
              <MathDrawingCanvas
                questionId={questionId}
                onDrawingChange={onDrawingChange || (() => {})}
                disabled={disabled}
                width={600}
                height={400}
                initialDrawing={drawingData}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInputChange}
              placeholder="Enter your mathematical expression using LaTeX notation..."
              disabled={disabled}
              className="w-full min-h-[100px] resize-none border-none outline-none bg-transparent text-lg font-mono"
              style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
            />
          </div>
        )}

        {/* Validation error */}
        {showValidation && !isValid && validationError && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Hint */}
        {hint && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Calculator className="w-4 h-4" />
              <span className="text-sm font-medium">Hint:</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{hint}</p>
          </div>
        )}
      </div>

      {/* Math toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Basic symbols */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Basic Symbols
              </h4>
              <div className="flex flex-wrap gap-2">
                {mathSymbols.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Button
                      key={item.symbol}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertMathSymbol(item.symbol)}
                      disabled={disabled}
                      className="h-8"
                    >
                      {IconComponent ? <IconComponent className="w-3 h-3 mr-1" /> : null}
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Math commands */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Math Functions
              </h4>
              <div className="flex flex-wrap gap-2">
                {mathCommands.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Button
                      key={item.command}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertMathCommand(item.command)}
                      disabled={disabled}
                      className="h-8"
                    >
                      {IconComponent ? <IconComponent className="w-3 h-3 mr-1" /> : null}
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Greek letters */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Greek Letters
              </h4>
              <div className="flex flex-wrap gap-2">
                {greekLetters.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Button
                      key={item.symbol}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertMathSymbol(item.symbol)}
                      disabled={disabled}
                      className="h-8"
                    >
                      {IconComponent ? <IconComponent className="w-3 h-3 mr-1" /> : null}
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && value && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg" style={{ fontFamily: 'serif' }}>
                {value}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
