Feature: Cross-project observability — mobile booking produces an audit trail in the API log stack

  # One scenario validates the full stack: Appium tap → SUT → Loki log entry.
  # Requires observability stack running alongside the SUT:
  #   docker-compose -f docker-compose.yml -f docker-compose.observability.yml up
  # Run with: LOKI_ENABLED=true npm run test:observability

  @observability
  Scenario: Patient booking via mobile triggers an appointment.booked log entry in Loki
    Given I am logged in as a patient and on the booking screen
    When I book the first available slot and record the appointment id
    Then the appointment.booked event for this booking appears in Loki
