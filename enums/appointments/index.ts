export const AppointmentErrors = {
    FORBIDDEN:              "FORBIDDEN",
    VALIDATION_ERROR:       "VALIDATION_ERROR",
    SLOT_TAKEN:             "SLOT_TAKEN",
    SLOT_NOT_FOUND:         "SLOT_NOT_FOUND",
    SLOT_TOO_SHORT:         "SLOT_TOO_SHORT",
    OUTSIDE_WORKING_HOURS:  "OUTSIDE_WORKING_HOURS",
    INVALID_TRANSITION:     "INVALID_TRANSITION",
    SERIES_NOT_FOUND:       "SERIES_NOT_FOUND",
    WAITLIST_DUPLICATE:     "WAITLIST_DUPLICATE",
    OFFER_ALREADY_RESOLVED: "OFFER_ALREADY_RESOLVED",
    PAYMENT_REQUIRED:       "PAYMENT_REQUIRED",
    CHAOS_ERROR:            "CHAOS_ERROR",
    INTERNAL_ERROR:         "INTERNAL_ERROR",
} as const;

export type AppointmentError = typeof AppointmentErrors[keyof typeof AppointmentErrors];
