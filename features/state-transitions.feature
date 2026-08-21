Feature: Appointment state transitions — lifecycle correctness
  As a QA engineer
  I want to verify all appointment lifecycle transitions are correctly enforced
  So that data integrity holds and invalid states cannot be reached via API or mobile UI

  # Valid transitions — each asserts API status + mobile UI badge
  # Setup is always via API; action is performed on mobile where a button exists

  @state-transitions @regression
  Scenario: pending → confirmed: doctor confirms on mobile
    Given an appointment in "pending" state is prepared
    And the doctor is logged in on mobile and sees the appointments
    When the doctor confirms the appointment on mobile
    Then the appointment badge shows "confirmed" in the doctor view
    And the API reports the appointment status as "confirmed"

  @state-transitions @regression
  Scenario: pending → rejected: doctor rejects on mobile
    Given an appointment in "pending" state is prepared
    And the doctor is logged in on mobile and sees the appointments
    When the doctor rejects the appointment on mobile
    Then the appointment badge shows "rejected" in the doctor view
    And the API reports the appointment status as "rejected"

  @state-transitions @regression
  Scenario: pending → cancelled: patient cancels on mobile
    Given an appointment in "pending" state is prepared
    And the patient is logged in on mobile and sees My Visits
    When the patient cancels the appointment on mobile
    Then the appointment badge shows "cancelled" in the patient view
    And the API reports the appointment status as "cancelled"

  @state-transitions @regression
  Scenario: confirmed → completed: doctor marks completed on mobile
    Given an appointment in "confirmed" state is prepared
    And the doctor is logged in on mobile and sees the appointments
    When the doctor marks the appointment as completed on mobile
    Then the appointment badge shows "completed" in the doctor view
    And the API reports the appointment status as "completed"

  @state-transitions @regression
  Scenario: confirmed → cancelled: doctor cancels on mobile
    Given an appointment in "confirmed" state is prepared
    And the doctor is logged in on mobile and sees the appointments
    When the doctor cancels the confirmed appointment on mobile
    Then the appointment badge shows "cancelled" in the doctor view
    And the API reports the appointment status as "cancelled"

  @state-transitions @regression
  Scenario: confirmed → cancelled: patient cancels on mobile
    Given an appointment in "confirmed" state is prepared
    And the patient is logged in on mobile and sees My Visits
    When the patient cancels the appointment on mobile
    Then the appointment badge shows "cancelled" in the patient view
    And the API reports the appointment status as "cancelled"

  # Invalid transition guards — API only; mobile badge asserted to confirm no state change

  @state-transitions @regression
  Scenario: confirmed → rejected is blocked (invalid transition guard)
    Given an appointment in "confirmed" state is prepared
    When the doctor attempts the "reject" transition via API
    Then the API returns 422 for the transition attempt
    And the API reports the appointment status as "confirmed"

  @state-transitions @regression
  Scenario: completed → cancelled is blocked (invalid transition guard)
    Given an appointment in "completed" state is prepared
    When the patient attempts to cancel via API
    Then the API returns 422 for the transition attempt
    And the API reports the appointment status as "completed"

  @state-transitions @regression
  Scenario: cancelled → confirmed is blocked (invalid transition guard)
    Given an appointment in "cancelled" state is prepared
    When the doctor attempts the "confirm" transition via API
    Then the API returns 422 for the transition attempt
    And the API reports the appointment status as "cancelled"

  @state-transitions @regression
  Scenario: pending → completed is blocked (invalid transition guard)
    Given an appointment in "pending" state is prepared
    When the doctor attempts the "complete" transition via API
    Then the API returns 422 for the transition attempt
    And the API reports the appointment status as "pending"

  # Concurrent transitions — race condition on the same appointment

  @state-transitions @regression
  Scenario: concurrent cancel and confirm — exactly one transition wins
    Given an appointment in "pending" state is prepared
    When the patient and doctor attempt simultaneous transitions via API
    Then exactly one transition succeeds and the final state is consistent
