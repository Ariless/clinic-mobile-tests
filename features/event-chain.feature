@event-chain @regression
Feature: Event-driven chain — booking actions produce correct WS events

  # Full chain: mobile UI action → SUT API → WebSocket notification → assert at test layer.
  # Tests open a WS connection as the target role and assert on received events.
  # This verifies the plumbing between the HTTP handler and the WS notifier —
  # a layer invisible to API-only tests.

  Scenario: Patient booking sends appointment.booked event to doctor
    Given a doctor WS client is connected
    When a patient books an appointment via the UI
    Then the doctor receives an appointment.booked event
    And the event contains the correct appointmentId and patient status "pending"

  Scenario: Doctor confirm sends appointment.confirmed event to patient
    Given a patient WS client is connected
    And a patient has a pending appointment
    When the doctor confirms the appointment via the API
    Then the patient receives an appointment.confirmed event
    And the event contains the correct appointmentId and patient status "confirmed"

  Scenario: No duplicate events when booking is retried
    Given a doctor WS client is connected
    When a patient books an appointment via the API
    And the patient attempts to book the same slot again
    Then exactly 1 appointment.booked event was received by the doctor
