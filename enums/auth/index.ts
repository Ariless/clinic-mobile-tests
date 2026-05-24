export const AuthErrors = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    FORBIDDEN:        "FORBIDDEN",
    INTERNAL_ERROR:   "INTERNAL_ERROR",
} as const;

export type AuthError = typeof AuthErrors[keyof typeof AuthErrors];
