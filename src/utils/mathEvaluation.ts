import * as math from 'mathjs';

export interface MathEvaluationResult {
  isCorrect: boolean;
  similarity: number;
  simplifiedAnswer: string;
  expectedAnswer: string;
  error?: string;
}

export interface MathQuestion {
  id: string;
  question_text: string;
  math_expression?: string;
  math_tolerance?: number;
  math_hint?: string;
}

/**
 * Evaluates a mathematical expression against the correct answer
 */
export const evaluateMathExpression = (
  userAnswer: string,
  expectedAnswer: string,
  tolerance: number = 0.01
): MathEvaluationResult => {
  try {
    // Clean and normalize expressions
    const cleanedUser = cleanMathExpression(userAnswer);
    const cleanedExpected = cleanMathExpression(expectedAnswer);
    
    // Check if they're exactly equal (string comparison)
    if (cleanedUser === cleanedExpected) {
      return {
        isCorrect: true,
        similarity: 1,
        simplifiedAnswer: cleanedUser,
        expectedAnswer: cleanedExpected
      };
    }
    
    // Try to evaluate both expressions numerically
    try {
      const userValue = math.evaluate(cleanedUser);
      const expectedValue = math.evaluate(cleanedExpected);
      
      if (typeof userValue === 'number' && typeof expectedValue === 'number') {
        const difference = Math.abs(userValue - expectedValue);
        const isCorrect = difference <= tolerance;
        const similarity = isCorrect ? Math.max(0, 1 - (difference / Math.abs(expectedValue || 1))) : 0;
        
        return {
          isCorrect,
          similarity,
          simplifiedAnswer: cleanedUser,
          expectedAnswer: cleanedExpected
        };
      }
    } catch (evalError) {
      // If numerical evaluation fails, try symbolic comparison
      return compareSymbolicExpressions(cleanedUser, cleanedExpected);
    }
    
    // Fallback to symbolic comparison
    return compareSymbolicExpressions(cleanedUser, cleanedExpected);
    
  } catch (error) {
    return {
      isCorrect: false,
      similarity: 0,
      simplifiedAnswer: userAnswer,
      expectedAnswer: expectedAnswer,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Cleans and normalizes mathematical expressions
 */
export const cleanMathExpression = (expression: string): string => {
  if (!expression) return '';
  
  let cleaned = expression.trim();
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Normalize common mathematical symbols
  cleaned = cleaned.replace(/\^/g, '**'); // Convert ^ to **
  cleaned = cleaned.replace(/\\cdot/g, '*'); // Convert \cdot to *
  cleaned = cleaned.replace(/\\times/g, '*'); // Convert \times to *
  cleaned = cleaned.replace(/\\div/g, '/'); // Convert \div to /
  cleaned = cleaned.replace(/\\pm/g, '±'); // Keep ± symbol
  cleaned = cleaned.replace(/\\mp/g, '∓'); // Keep ∓ symbol
  
  // Handle fractions
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Handle square roots
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  cleaned = cleaned.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '($2)^(1/($1))');
  
  // Handle exponents
  cleaned = cleaned.replace(/\^(\d+)/g, '**$1');
  cleaned = cleaned.replace(/\^\{([^}]+)\}/g, '**($1)');
  
  // Handle subscripts (convert to function notation where appropriate)
  cleaned = cleaned.replace(/([a-zA-Z])_(\d+)/g, '$1$2');
  cleaned = cleaned.replace(/([a-zA-Z])_\{([^}]+)\}/g, '$1$2');
  
  // Handle common functions
  cleaned = cleaned.replace(/\\sin/g, 'sin');
  cleaned = cleaned.replace(/\\cos/g, 'cos');
  cleaned = cleaned.replace(/\\tan/g, 'tan');
  cleaned = cleaned.replace(/\\log/g, 'log');
  cleaned = cleaned.replace(/\\ln/g, 'log');
  cleaned = cleaned.replace(/\\exp/g, 'exp');
  
  // Handle Greek letters
  cleaned = cleaned.replace(/\\alpha/g, 'α');
  cleaned = cleaned.replace(/\\beta/g, 'β');
  cleaned = cleaned.replace(/\\gamma/g, 'γ');
  cleaned = cleaned.replace(/\\delta/g, 'δ');
  cleaned = cleaned.replace(/\\epsilon/g, 'ε');
  cleaned = cleaned.replace(/\\theta/g, 'θ');
  cleaned = cleaned.replace(/\\lambda/g, 'λ');
  cleaned = cleaned.replace(/\\mu/g, 'μ');
  cleaned = cleaned.replace(/\\pi/g, 'π');
  cleaned = cleaned.replace(/\\sigma/g, 'σ');
  cleaned = cleaned.replace(/\\tau/g, 'τ');
  cleaned = cleaned.replace(/\\phi/g, 'φ');
  cleaned = cleaned.replace(/\\omega/g, 'ω');
  
  // Handle infinity
  cleaned = cleaned.replace(/\\infty/g, 'Infinity');
  
  // Remove LaTeX commands that don't affect math
  cleaned = cleaned.replace(/\\left/g, '');
  cleaned = cleaned.replace(/\\right/g, '');
  cleaned = cleaned.replace(/\\,|\\:|\\;|\\!|\\quad|\\qquad/g, ' ');
  
  return cleaned;
};

/**
 * Compares expressions symbolically using mathjs
 */
const compareSymbolicExpressions = (userExpr: string, expectedExpr: string): MathEvaluationResult => {
  try {
    // Try to simplify both expressions
    const userSimplified = math.simplify(userExpr).toString();
    const expectedSimplified = math.simplify(expectedExpr).toString();
    
    // Check if simplified forms are equal
    if (userSimplified === expectedSimplified) {
      return {
        isCorrect: true,
        similarity: 1,
        simplifiedAnswer: userSimplified,
        expectedAnswer: expectedSimplified
      };
    }
    
    // Try to check if they're mathematically equivalent
    try {
      const userParsed = math.parse(userExpr);
      const expectedParsed = math.parse(expectedExpr);
      
      // Check if the difference is zero
      const difference = math.simplify(`(${userExpr}) - (${expectedExpr})`);
      const isZero = difference.toString() === '0';
      
      if (isZero) {
        return {
          isCorrect: true,
          similarity: 1,
          simplifiedAnswer: userSimplified,
          expectedAnswer: expectedSimplified
        };
      }
    } catch (parseError) {
      // If parsing fails, fall back to string similarity
    }
    
    // Calculate string similarity as fallback
    const similarity = calculateStringSimilarity(userExpr, expectedExpr);
    
    return {
      isCorrect: false,
      similarity,
      simplifiedAnswer: userSimplified,
      expectedAnswer: expectedSimplified
    };
    
  } catch (error) {
    return {
      isCorrect: false,
      similarity: 0,
      simplifiedAnswer: userExpr,
      expectedAnswer: expectedExpr,
      error: error instanceof Error ? error.message : 'Symbolic comparison failed'
    };
  }
};

/**
 * Calculates string similarity between two expressions
 */
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Calculates Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Validates if a mathematical expression is syntactically correct
 */
export const validateMathExpression = (expression: string): { isValid: boolean; error?: string } => {
  try {
    if (!expression || expression.trim() === '') {
      return { isValid: false, error: 'Expression cannot be empty' };
    }
    
    const cleaned = cleanMathExpression(expression);
    math.parse(cleaned);
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid mathematical expression'
    };
  }
};

/**
 * Generates a hint for a mathematical question
 */
export const generateMathHint = (question: MathQuestion): string => {
  if (question.math_hint) {
    return question.math_hint;
  }
  
  // Generate basic hints based on the expected expression
  if (question.math_expression) {
    const expr = question.math_expression;
    
    if (expr.includes('\\frac')) {
      return 'Remember to simplify fractions to their lowest terms.';
    }
    if (expr.includes('\\sqrt')) {
      return 'Check if you can simplify the square root.';
    }
    if (expr.includes('^')) {
      return 'Make sure to apply exponent rules correctly.';
    }
    if (expr.includes('+') || expr.includes('-')) {
      return 'Combine like terms and simplify.';
    }
  }
  
  return 'Double-check your work and ensure your answer is simplified.';
};
