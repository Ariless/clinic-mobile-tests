@otel @observability @regression @android
Feature: OpenTelemetry trace propagation — mobile tap to DB span

  # Mobile generates a W3C traceparent header on every API request.
  # SUT logs traceparent alongside all domain events (pino-http customProps).
  # Loki receives the full span: mobile tap → POST /appointments → DB insert.
  #
  # Test flow:
  #   1. Clear logcat
  #   2. Complete a booking (Appium drives the mobile app)
  #   3. Read logcat → extract the traceparent used for POST /appointments
  #   4. Query Loki for that traceId — assert appointment.booked event found
  #   5. Assert appointmentId is present in the Loki entry
  #   6. Assert responseTime (latency) is captured in the span
  #
  # Requires: LOKI_ENABLED=true + observability stack running.
  # Skips with 'pending' if Loki is not available.

  Scenario: Mobile-originated traceparent links booking span in Loki
    Given the logcat buffer is cleared
    And I am logged in as a patient
    When I select the first available doctor
    And I book the first available slot
    Then the Loki trace for this booking contains the mobile traceId
    And the Loki trace contains the appointmentId
    And the Loki trace contains a response time measurement
