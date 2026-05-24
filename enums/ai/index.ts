export const AiErrors = {
    UNKNOWN_SPECIALTY:      "UNKNOWN_SPECIALTY",
    FEATURE_DISABLED:       "FEATURE_DISABLED",
    CLAUDE_UNAVAILABLE:     "CLAUDE_UNAVAILABLE",
    AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
    RATE_LIMITED:           "RATE_LIMITED",
    VALIDATION_ERROR:       "VALIDATION_ERROR",
} as const;

export const ALLOWED_SPECIALTIES = [
    "General Practitioner",
    "Cardiologist",
    "Neurologist",
    "Dermatologist",
    "Orthopedist",
    "Pediatrician",
] as const;

export type AllowedSpecialty = typeof ALLOWED_SPECIALTIES[number];
export type AiError = typeof AiErrors[keyof typeof AiErrors];
