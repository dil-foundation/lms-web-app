import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  parseQuizFromPDF, 
  convertToQuizFormat,
  ParseResult,
  ExtractedQuestion 
} from '@/services/pdfQuizParsingService';
import { QuizData } from '@/pages/CourseBuilder';

interface PDFQuizUploaderProps {
  onQuizExtracted: (quiz: QuizData) => void;
  onClose: () => void;
}

export const PDFQuizUploader: React.FC<PDFQuizUploaderProps> = ({
  onQuizExtracted,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ExtractedQuestion[]>([]);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'complete'>('upload');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setStep('processing');
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 80) return prev + 15;
          return prev;
        });
      }, 300);

      const result = await parseQuizFromPDF(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setParseResult(result);
      
      if (result.success && result.questions.length > 0) {
        setPreviewQuestions(result.questions);
        setStep('preview');
        toast.success(`Successfully extracted ${result.questions.length} questions`);
      } else {
        toast.error(result.error || 'Could not extract questions from PDF');
        setStep('upload');
      }
      
    } catch (error) {
      toast.error('Failed to process PDF file');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleConfirmExtraction = () => {
    if (parseResult && previewQuestions.length > 0) {
      const quizData = convertToQuizFormat(previewQuestions);
      onQuizExtracted(quizData);
      setStep('complete');
      toast.success('Quiz questions added successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleEditQuestion = (index: number, field: keyof ExtractedQuestion, value: any) => {
    setPreviewQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const handleRemoveQuestion = (index: number) => {
    setPreviewQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditOption = (questionIndex: number, optionIndex: number, value: string) => {
    setPreviewQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    setPreviewQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.options) {
        const newOptions = q.options.filter((_, j) => j !== optionIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleAddOption = (questionIndex: number) => {
    setPreviewQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = [...(q.options || []), 'New option'];
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-300 dark:border-gray-600'}
          hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-purple-500" />
        <h3 className="text-lg font-semibold mb-2">Upload Quiz PDF</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isDragActive ? 'Drop your PDF file here' : 'Drag & drop your quiz PDF or click to browse'}
        </p>
        <p className="text-sm text-gray-500">
          Max size: 10MB • Supports text-based PDFs
        </p>
      </div>

      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Supported formats:</strong>
          <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
            <li>Multiple choice questions (A, B, C, D format)</li>
            <li>Numbered questions (1, 2, 3, 4 format)</li>
            <li>True/False questions</li>
            <li>Short answer questions</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <FileText className="w-16 h-16 mx-auto text-purple-500 animate-pulse" />
        <h3 className="text-lg font-semibold">Processing Your PDF</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Analyzing the document and extracting quiz questions...
        </p>
      </div>
      
      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-gray-500">{progress}% complete</p>
      </div>
      
      {selectedFile && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span>{selectedFile.name}</span>
          <Badge variant="secondary">{(selectedFile.size / 1024 / 1024).toFixed(1)}MB</Badge>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Extracted Questions</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Found {previewQuestions.length} questions. Review and edit before adding to your quiz.
          </p>
        </div>
        {parseResult && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="capitalize">
              {parseResult.method}
            </Badge>
            <Badge variant={parseResult.confidence > 0.7 ? 'default' : 'secondary'}>
              {Math.round(parseResult.confidence * 100)}% confidence
            </Badge>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto space-y-4">
        {previewQuestions.map((question, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <span>Question {index + 1}</span>
                  <Badge 
                    variant={question.type === 'single_choice' ? 'default' : 
                            question.type === 'multiple_choice' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {question.type.replace('_', ' ')}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQuestion(index)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Question Text Editor */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Question Text
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => handleEditQuestion(index, 'question', e.target.value)}
                  className="w-full mt-1 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
                  rows={3}
                  placeholder="Enter your question here..."
                />
              </div>
              
              {/* Options Editor */}
              {question.options && question.options.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Answer Options
                  </label>
                  <div className="space-y-2 mt-2">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <Badge variant="outline" className="w-6 h-6 text-xs flex items-center justify-center">
                          {String.fromCharCode(65 + optIndex)}
                        </Badge>
                        <input
                          value={option}
                          onChange={(e) => handleEditOption(index, optIndex, e.target.value)}
                          className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
                          placeholder="Enter option text..."
                        />
                        {question.options!.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index, optIndex)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {question.options.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOption(index)}
                        className="w-full h-8 border-dashed"
                      >
                        Add Option
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Correct Answer Indicator */}
              {question.correctAnswer && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <strong>Detected Answer:</strong> {question.correctAnswer}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Upload Different PDF
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmExtraction}
            disabled={previewQuestions.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Add {previewQuestions.length} Questions to Quiz
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-4 py-8">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
      <h3 className="text-lg font-semibold">Quiz Questions Added Successfully!</h3>
      <p className="text-gray-600 dark:text-gray-400">
        {previewQuestions.length} questions have been added to your quiz.
      </p>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <span>Import Quiz from PDF</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  );
};
