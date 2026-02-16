import { ValidatedAction } from './ai-action-parser'

/**
 * Get a summary of validation results
 * This is a client-side utility that doesn't need 'use server'
 */
export function getValidationSummary(validatedActions: ValidatedAction[]): {
  totalActions: number
  validActions: number
  invalidActions: number
  hasWarnings: boolean
} {
  return {
    totalActions: validatedActions.length,
    validActions: validatedActions.filter(va => va.validation.valid).length,
    invalidActions: validatedActions.filter(va => !va.validation.valid).length,
    hasWarnings: validatedActions.some(va => va.validation.warnings.length > 0)
  }
}
