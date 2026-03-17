/**
 * Shared password validation rules.
 * Min 10 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push("Must be at least 10 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Must contain at least one digit");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
}

export const PASSWORD_RULES_DESCRIPTION =
  "At least 10 characters with uppercase, lowercase, digit, and special character";
