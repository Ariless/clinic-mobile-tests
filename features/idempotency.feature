Feature: Idempotency — retrying a failed booking does not create duplicate appointments

  # Network drops after the POST /appointments request is sent but before the response
  # arrives. The app shows an error and the patient retries. The server must not create
  # a second appointment for the same slot — exactly one row should exist in the DB.

  @idempotency @chaos
  Scenario: Network drop after booking request does not create a duplicate appointment
    Given I am logged in as a patient and on the booking screen
    And I record the first available slot id for doctor 1
    When slow network is applied with 2000ms delay
    And I start booking the first available slot
    And wifi is disabled
    And wifi is restored
    And I retry the booking attempt
    Then at most one appointment exists for that slot
