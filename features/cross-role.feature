Feature: Cross-role appointment flow
  As a patient and doctor using the mobile app
  I want to ensure appointment state transitions are visible across roles

  Background:
    Given the patient logs in and books a new appointment

  @cross-role @smoke
  Scenario: Doctor confirms a patient booking — patient sees confirmed status
    When the patient logs out
    And the doctor logs in and confirms the pending appointment
    And the doctor logs out
    And the patient logs in again
    Then the patient sees the appointment with status "confirmed"

  @cross-role @regression
  Scenario: Doctor rejects a patient booking — patient sees rejected status
    When the patient logs out
    And the doctor logs in and rejects the pending appointment
    And the doctor logs out
    And the patient logs in again
    Then the patient sees the appointment with status "rejected"
