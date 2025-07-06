export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFirstName(value: string): ValidationResult {
  const v = value.trim();
  
  if (v === '') {
    return { isValid: false, error: 'First name is required.' };
  }
  
  if (!/^[a-zA-Z '.-]+$/.test(v)) {
    return { isValid: false, error: "Name can only contain letters, spaces, and '.-" };
  }
  
  if (v.length < 2) {
    return { isValid: false, error: 'First name must be at least 2 characters.' };
  }
  
  if (v.length > 30) {
    return { isValid: false, error: 'First name cannot be more than 30 characters.' };
  }
  
  return { isValid: true };
}

export function validateLastName(value: string): ValidationResult {
  const v = value.trim();
  
  if (v === '') {
    return { isValid: false, error: 'Last name is required.' };
  }
  
  if (!/^[a-zA-Z '.-]+$/.test(v)) {
    return { isValid: false, error: "Name can only contain letters, spaces, and '.-" };
  }
  
  if (v.length < 2) {
    return { isValid: false, error: 'Last name must be at least 2 characters.' };
  }
  
  if (v.length > 30) {
    return { isValid: false, error: 'Last name cannot be more than 30 characters.' };
  }
  
  return { isValid: true };
}

export function validateEmail(value: string): ValidationResult {
  const v = value.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (v === '') {
    return { isValid: false, error: 'Email is required.' };
  }
  
  if (!emailRegex.test(v)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  
  return { isValid: true };
}

export function validatePassword(value: string): ValidationResult {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (value === '') {
    return { isValid: false, error: 'Password is required.' };
  }
  
  if (!passwordRegex.test(value)) {
    return { isValid: false, error: 'Needs 8+ chars, with uppercase, lowercase, number, & symbol.' };
  }
  
  return { isValid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (confirmPassword === '') {
    return { isValid: false, error: 'Please confirm your password.' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  
  return { isValid: true };
}

export function validateGrade(value: string): ValidationResult {
  if (value === '') {
    return { isValid: false, error: 'Please select your grade.' };
  }
  
  return { isValid: true };
}

export const validateTeacherId = (teacherId: string): ValidationResult => {
  if (!teacherId) {
    return {
      isValid: false,
      error: 'Teacher ID is required'
    };
  }

  if (teacherId.length < 3) {
    return {
      isValid: false,
      error: 'Teacher ID must be at least 3 characters'
    };
  }

  return {
    isValid: true
  };
};
