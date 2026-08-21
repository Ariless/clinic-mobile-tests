Feature: Empathy testing — patient-facing messages meet medical-grade communication standards

  @empathy @ai
  Scenario: Wrong password error message is patient-appropriate
    When I enter wrong credentials on the login screen
    Then the on-screen message is rated at least 4 out of 5 for patient empathy

  @empathy @ai
  Scenario: Network failure during booking shows a helpful and calming error
    Given I am logged in as a patient
    When I select the first available doctor
    And wifi is disabled
    And I attempt to book the first available slot
    Then the booking error message is rated at least 4 out of 5 for patient empathy

  @empathy @ai
  Scenario: Appointment cancellation response is appropriate for a patient under stress
    Given I am logged in as a patient
    And I have a pending appointment via API
    When I open My Visits
    And I cancel my pending appointment
    Then the on-screen message is rated at least 4 out of 5 for patient empathy
