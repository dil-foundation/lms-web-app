import { QuizQuestion, QuizData } from '@/pages/CourseBuilder';

// Types for PDF parsing
export interface ExtractedQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  type: 'single_choice' | 'multiple_choice' | 'text_answer';
}

export interface ParseResult {
  success: boolean;
  questions: ExtractedQuestion[];
  method: 'text' | 'pattern' | 'ai';
  confidence: number;
  error?: string;
}

// PDF text extraction using PDF.js
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Try to use PDF.js if available
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    }
    
    // Fallback: Try dynamic import for PDF.js
    try {
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    } catch (pdfError) {
      console.log('PDF.js not available, using fallback extraction');
    }
    
    // Basic fallback for simple text-based PDFs
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Look for text patterns in the PDF binary
          let text = '';
          let i = 0;
          
          // Simple heuristic: look for readable text sequences
          while (i < uint8Array.length - 3) {
            // Look for sequences that might be text
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              let textSequence = '';
              let j = i;
              
              // Collect consecutive readable characters
              while (j < uint8Array.length && 
                     ((uint8Array[j] >= 32 && uint8Array[j] <= 126) || 
                      uint8Array[j] === 9 || uint8Array[j] === 10 || uint8Array[j] === 13)) {
                textSequence += String.fromCharCode(uint8Array[j]);
                j++;
              }
              
              // If we found a reasonable text sequence, add it
              if (textSequence.length > 3 && /[a-zA-Z]/.test(textSequence)) {
                text += textSequence + ' ';
              }
              
              i = j;
            } else {
              i++;
            }
          }
          
          // Clean up the extracted text
          text = text
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\?\.\,\!\(\)\:\;\'\"-]/g, ' ')
            .trim();
          
          if (text.length > 50 && /[a-zA-Z]{3,}/.test(text)) {
            resolve(text);
          } else {
            reject(new Error('Could not extract readable text from PDF'));
          }
        } catch (error) {
          reject(new Error('Failed to process PDF file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
    
  } catch (error) {
    throw new Error('Failed to extract text from PDF');
  }
}

// Advanced pattern-based question extraction
export function extractQuestionsWithPatterns(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  
  // Preserve line breaks for better parsing
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  console.log('Extracted text:', cleanText.substring(0, 500) + '...');
  
  // Split text into lines for better processing
  const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for numbered question pattern: "1) Question text?"
  const questionAnswerPairs: { question: string; answer?: string }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts with a number followed by ) and contains a question
    const questionMatch = line.match(/^(\d+)\)\s*(.+\?)$/);
    
    if (questionMatch) {
      const questionNumber = questionMatch[1];
      const questionText = questionMatch[2].trim();
      
      // Look for the answer in the next few lines
      let answer = '';
      let j = i + 1;
      
      // Collect answer lines (usually indented or following the question)
      while (j < lines.length && j < i + 5) { // Look ahead max 5 lines
        const nextLine = lines[j].trim();
        
        // Stop if we hit another numbered question
        if (/^\d+\)\s*.+/.test(nextLine)) {
          break;
        }
        
        // If this looks like an answer (not starting with number, not too long)
        if (nextLine && nextLine.length < 200 && !nextLine.includes('?')) {
          answer = nextLine;
          break;
        }
        
        j++;
      }
      
      questionAnswerPairs.push({
        question: questionText,
        answer: answer || undefined
      });
      
      console.log(`Found question ${questionNumber}: ${questionText}`);
      console.log(`Answer: ${answer}`);
    }
  }
  
  // Convert to ExtractedQuestion format
  questionAnswerPairs.forEach(pair => {
    if (pair.question && pair.question.length > 5) {
      questions.push({
        question: pair.question,
        options: undefined, // These are text answer questions
        correctAnswer: pair.answer,
        type: 'text_answer'
      });
    }
  });
  
  // Fallback: Try other patterns if no numbered questions found
  if (questions.length === 0) {
    console.log('No numbered questions found, trying fallback patterns...');
    
    const questionPatterns = [
      // Pattern 1: "1. What is...?" or "Question 1: What is...?"
      /(?:^|\n)(?:\d+[\.\)]\s*|Question\s*\d*[\:\.]?\s*)(.*?\?)/gmi,
      
      // Pattern 2: "Q1: What is...?" or "Q. What is...?"
      /(?:^|\n)Q\.?\d*[\:\.]?\s*(.*?\?)/gmi,
      
      // Pattern 3: Simple questions ending with ?
      /(?:^|\n)([A-Z][^?\n]*\?)/gm
    ];

    let allMatches: string[] = [];

    // Extract questions using all patterns
    questionPatterns.forEach(pattern => {
      const matches = Array.from(cleanText.matchAll(pattern));
      const questionTexts = matches.map(match => match[1]?.trim()).filter(q => q && q.length > 10);
      allMatches.push(...questionTexts);
    });

    // Remove duplicates and clean up
    const uniqueQuestions = [...new Set(allMatches)].map(q => q.trim());

    // Add fallback questions
    uniqueQuestions.forEach(questionText => {
      if (questionText && questionText.length > 5) {
        questions.push({
          question: questionText,
          options: undefined,
          correctAnswer: undefined,
          type: 'text_answer'
        });
      }
    });
  }
  
  console.log(`Total questions found: ${questions.length}`);
  return questions.filter(q => q.question.length >= 5);
}

// Simple AI-like parsing using heuristics
export function parseQuestionsWithHeuristics(text: string): ExtractedQuestion[] {
  const questions = extractQuestionsWithPatterns(text);
  
  // Apply intelligence to improve extraction
  return questions.map(question => {
    let improvedQuestion = { ...question };
    
    // Clean up question text
    improvedQuestion.question = question.question
      .replace(/^\d+[\.\)]\s*/, '') // Remove leading numbers
      .replace(/^Q\.?\d*[\:\.]?\s*/i, '') // Remove Q prefix
      .replace(/^Question\s*\d*[\:\.]?\s*/i, '') // Remove Question prefix
      .trim();
    
    // Improve option cleaning
    if (question.options) {
      improvedQuestion.options = question.options.map(option => 
        option
          .replace(/^[A-D][\)\.\:]\s*/i, '') // Remove A) B) C) D) prefixes
          .replace(/^\d+[\)\.\:]\s*/, '') // Remove number prefixes
          .replace(/^[•\-\*]\s*/, '') // Remove bullet prefixes
          .trim()
      ).filter(opt => opt.length > 0);
    }
    
    // If we have options but no type specified, default to single_choice
    if (improvedQuestion.options && improvedQuestion.options.length > 0 && !improvedQuestion.type) {
      improvedQuestion.type = 'single_choice';
    }
    
    return improvedQuestion;
  });
}

// Main parsing function
export async function parseQuizFromPDF(file: File): Promise<ParseResult> {
  console.log('Starting PDF parsing for:', file.name, 'Size:', file.size);
  
  try {
    // Validate file
    if (!file.type.includes('pdf')) {
      console.log('Invalid file type:', file.type);
      return {
        success: false,
        questions: [],
        method: 'text',
        confidence: 0,
        error: 'File must be a PDF'
      };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.log('File too large:', file.size);
      return {
        success: false,
        questions: [],
        method: 'text',
        confidence: 0,
        error: 'File size must be less than 10MB'
      };
    }
    
    // Try to extract text
    let text: string;
    try {
      console.log('Attempting to extract text from PDF...');
      text = await extractTextFromPDF(file);
      console.log('Text extracted successfully, length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
    } catch (error) {
      console.error('Text extraction failed:', error);
      return {
        success: false,
        questions: [],
        method: 'text',
        confidence: 0,
        error: `Could not extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
    
    // Parse questions using heuristics
    console.log('Parsing questions from extracted text...');
    const questions = parseQuestionsWithHeuristics(text);
    console.log('Questions parsed:', questions.length);
    
    if (questions.length === 0) {
      console.log('No questions found after parsing');
      return {
        success: false,
        questions: [],
        method: 'pattern',
        confidence: 0,
        error: 'No quiz questions found in the PDF. Please ensure the PDF contains numbered questions ending with question marks.'
      };
    }
    
    // Calculate confidence based on extraction quality
    let confidence = 0.6; // Base confidence for pattern matching
    
    // Boost confidence if we have well-structured questions
    const questionsWithOptions = questions.filter(q => q.options && q.options.length > 1).length;
    const questionsWithCorrectAnswers = questions.filter(q => q.correctAnswer).length;
    
    confidence += (questionsWithOptions / questions.length) * 0.2;
    confidence += (questionsWithCorrectAnswers / questions.length) * 0.2;
    
    // Boost if questions look well-formed
    const wellFormedQuestions = questions.filter(q => 
      q.question.length > 15 && 
      q.question.includes('?') &&
      (!q.options || q.options.every(opt => opt.length > 3))
    ).length;
    
    confidence += (wellFormedQuestions / questions.length) * 0.1;
    confidence = Math.min(confidence, 1.0);
    
    return {
      success: true,
      questions,
      method: 'pattern',
      confidence
    };
    
  } catch (error) {
    return {
      success: false,
      questions: [],
      method: 'text',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Convert extracted questions to QuizData format
export function convertToQuizFormat(extractedQuestions: ExtractedQuestion[]): QuizData {
  const questions: QuizQuestion[] = extractedQuestions.map((eq, index) => ({
    id: `extracted_${Date.now()}_${index}`,
    question_text: eq.question,
    question_type: eq.type,
    options: eq.options ? eq.options.map((option, optIndex) => ({
      id: `option_${Date.now()}_${index}_${optIndex}`,
      option_text: option,
      is_correct: eq.correctAnswer ? 
        (Array.isArray(eq.correctAnswer) ? 
          eq.correctAnswer.includes(option) : 
          eq.correctAnswer === option || eq.correctAnswer === String.fromCharCode(65 + optIndex)) : 
        optIndex === 0, // Default first option as correct if no answer provided
      position: optIndex + 1
    })) : [],
    position: index + 1
  }));
  
  return {
    id: `quiz_${Date.now()}`,
    questions
  };
}
