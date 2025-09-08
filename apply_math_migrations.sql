-- Apply math expression and drawing support migrations
-- This script adds the missing math fields to the quiz_questions table

-- Add math-specific fields to quiz_questions table (from migration 126)
DO $$ 
BEGIN
    -- Add math_expression column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_questions' AND column_name = 'math_expression') THEN
        ALTER TABLE quiz_questions ADD COLUMN math_expression TEXT;
        COMMENT ON COLUMN quiz_questions.math_expression IS 'LaTeX expression representing the correct mathematical answer';
    END IF;

    -- Add math_tolerance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_questions' AND column_name = 'math_tolerance') THEN
        ALTER TABLE quiz_questions ADD COLUMN math_tolerance NUMERIC(5,4) DEFAULT 0.01;
        COMMENT ON COLUMN quiz_questions.math_tolerance IS 'Acceptable numerical variance for math answers (0.01 = 1%)';
    END IF;

    -- Add math_hint column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_questions' AND column_name = 'math_hint') THEN
        ALTER TABLE quiz_questions ADD COLUMN math_hint TEXT;
        COMMENT ON COLUMN quiz_questions.math_hint IS 'Optional hint to help students with the math question';
    END IF;

    -- Add math_allow_drawing column if it doesn't exist (from migration 127)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_questions' AND column_name = 'math_allow_drawing') THEN
        ALTER TABLE quiz_questions ADD COLUMN math_allow_drawing BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN quiz_questions.math_allow_drawing IS 'Whether drawing canvas is enabled for this math expression question';
    END IF;
END $$;

-- Update the question_type check constraint to include 'math_expression'
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'quiz_questions_question_type_check') THEN
        ALTER TABLE quiz_questions DROP CONSTRAINT quiz_questions_question_type_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE quiz_questions 
    ADD CONSTRAINT quiz_questions_question_type_check 
    CHECK (question_type IN ('single_choice', 'multiple_choice', 'text_answer', 'math_expression'));
END $$;

-- Add comment to question_type column
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: single_choice (one correct answer), multiple_choice (multiple correct answers), text_answer (manual grading required), math_expression (mathematical expression input)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_questions' 
AND column_name IN ('math_expression', 'math_tolerance', 'math_hint', 'math_allow_drawing')
ORDER BY column_name;
