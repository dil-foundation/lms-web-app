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
    
    let newValue: string;
    let cursorPos: number;
    
    switch (command) {
      case 'frac':
        newValue = value.substring(0, start) + `(${selectedText || 'a'})/(${selectedText || 'b'})` + value.substring(end);
        cursorPos = start + 1;
        break;
      case 'sqrt':
        newValue = value.substring(0, start) + `√(${selectedText || 'x'})` + value.substring(end);
        cursorPos = start + 2;
        break;
      case '^':
        newValue = value.substring(0, start) + `^(${selectedText || '2'})` + value.substring(end);
        cursorPos = start + 2;
        break;
      case '_':
        newValue = value.substring(0, start) + `_(${selectedText || '1'})` + value.substring(end);
        cursorPos = start + 2;
        break;
      default:
        // For functions like sin, cos, etc.
        newValue = value.substring(0, start) + `${command}(${selectedText || ''})` + value.substring(end);
        cursorPos = start + command.length + 1;
    }
    
    onChange(newValue);
    
    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos + (selectedText ? selectedText.length : 0));
    }, 0);
  };

  const mathSymbols = [
    { symbol: '+', label: 'Plus', icon: Plus },
    { symbol: '-', label: 'Minus', icon: Minus },
    { symbol: '×', label: 'Times', icon: X },
    { symbol: '÷', label: 'Divide', icon: Divide },
    { symbol: '=', label: 'Equals' },
    { symbol: '≠', label: 'Not Equal' },
    { symbol: '<', label: 'Less Than' },
    { symbol: '>', label: 'Greater Than' },
    { symbol: '≤', label: 'Less or Equal' },
    { symbol: '≥', label: 'Greater or Equal' },
    { symbol: '±', label: 'Plus Minus' },
    { symbol: '∓', label: 'Minus Plus' },
  ];

  const mathCommands = [
    { command: 'frac', label: 'Fraction', icon: Divide, display: 'a/b' },
    { command: 'sqrt', label: 'Square Root', icon: Square, display: '√' },
    { command: '^', label: 'Superscript', icon: ArrowUp, display: 'x²' },
    { command: '_', label: 'Subscript', display: 'x₁' },
    { command: 'sin', label: 'Sine', display: 'sin' },
    { command: 'cos', label: 'Cosine', display: 'cos' },
    { command: 'tan', label: 'Tangent', display: 'tan' },
    { command: 'log', label: 'Logarithm', display: 'log' },
    { command: 'ln', label: 'Natural Log', display: 'ln' },
    { command: 'exp', label: 'Exponential', display: 'exp' },
  ];

  const greekLetters = [
    { symbol: 'α', label: 'Alpha (α)' },
    { symbol: 'β', label: 'Beta (β)' },
    { symbol: 'γ', label: 'Gamma (γ)' },
    { symbol: 'δ', label: 'Delta (δ)' },
    { symbol: 'ε', label: 'Epsilon (ε)' },
    { symbol: 'θ', label: 'Theta (θ)' },
    { symbol: 'λ', label: 'Lambda (λ)' },
    { symbol: 'μ', label: 'Mu (μ)' },
    { symbol: 'π', label: 'Pi (π)', icon: Circle },
    { symbol: 'σ', label: 'Sigma (σ)' },
    { symbol: 'τ', label: 'Tau (τ)' },
    { symbol: 'φ', label: 'Phi (φ)' },
    { symbol: 'ω', label: 'Omega (ω)' },
    { symbol: '∞', label: 'Infinity (∞)', icon: Hash },
  ];

  return (
    <div className="space-y-4">
      {/* Main input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mathematical Expression
          </label>
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
                  placeholder="Enter your mathematical expression using standard notation..."
                  disabled={disabled}
                  className="w-full min-h-[100px] resize-none border-none outline-none bg-transparent text-lg"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                />
              </div>
              
              {/* Symbol palettes - only visible in Text Input mode */}
              <div className="space-y-4">
                {/* Basic Symbols */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Symbols</h4>
                  <div className="flex flex-wrap gap-2">
                    {mathSymbols.map(({ symbol, label, icon: Icon }) => (
                      <Button
                        key={symbol}
                        size="sm"
                        variant="outline"
                        onClick={() => insertMathSymbol(symbol)}
                        disabled={disabled}
                        className="h-8 px-3"
                        title={label}
                      >
                        {Icon ? <Icon className="w-4 h-4 mr-1" /> : null}
                        {symbol}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Math Functions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Math Functions</h4>
                  <div className="flex flex-wrap gap-2">
                    {mathCommands.map(({ command, display, icon: Icon }) => (
                      <Button
                        key={command}
                        size="sm"
                        variant="outline"
                        onClick={() => insertMathCommand(command)}
                        disabled={disabled}
                        className="h-8 px-3"
                        title={display}
                      >
                        {Icon ? <Icon className="w-4 h-4 mr-1" /> : null}
                        {display}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Greek Letters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Greek Letters</h4>
                  <div className="flex flex-wrap gap-2">
                    {greekLetters.map(({ symbol, label, icon: Icon }) => (
                      <Button
                        key={symbol}
                        size="sm"
                        variant="outline"
                        onClick={() => insertMathSymbol(symbol)}
                        disabled={disabled}
                        className="h-8 px-3"
                        title={label}
                      >
                        {Icon ? <Icon className="w-3 h-3 mr-1" /> : null}
                        <span className="mr-1 text-lg font-semibold">{symbol}</span>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
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
          <div className="space-y-4">
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                placeholder="Enter your mathematical expression using standard notation..."
                disabled={disabled}
                className="w-full min-h-[100px] resize-none border-none outline-none bg-transparent text-lg"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
            </div>
            
            {/* Symbol palettes - only visible when not using drawing mode */}
            <div className="space-y-4">
              {/* Basic Symbols */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Symbols</h4>
                <div className="flex flex-wrap gap-2">
                  {mathSymbols.map(({ symbol, label, icon: Icon }) => (
                    <Button
                      key={symbol}
                      size="sm"
                      variant="outline"
                      onClick={() => insertMathSymbol(symbol)}
                      disabled={disabled}
                      className="h-8 px-3"
                      title={label}
                    >
                      {Icon ? <Icon className="w-4 h-4 mr-1" /> : null}
                      {symbol}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Math Functions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Math Functions</h4>
                <div className="flex flex-wrap gap-2">
                  {mathCommands.map(({ command, display, icon: Icon }) => (
                    <Button
                      key={command}
                      size="sm"
                      variant="outline"
                      onClick={() => insertMathCommand(command)}
                      disabled={disabled}
                      className="h-8 px-3"
                      title={display}
                    >
                      {Icon ? <Icon className="w-4 h-4 mr-1" /> : null}
                      {display}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Greek Letters */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Greek Letters</h4>
                <div className="flex flex-wrap gap-2">
                  {greekLetters.map(({ symbol, label, icon: Icon }) => (
                    <Button
                      key={symbol}
                      size="sm"
                      variant="outline"
                      onClick={() => insertMathSymbol(symbol)}
                      disabled={disabled}
                      className="h-8 px-3"
                      title={label}
                    >
                      {Icon ? <Icon className="w-3 h-3 mr-1" /> : null}
                      <span className="mr-1 text-lg font-semibold">{symbol}</span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
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
    </div>
  );
};
