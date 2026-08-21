Feature: ADB chaos — resilience under device-level disruption
  As a QA engineer
  I want to verify the app handles device-level failures gracefully
  So that patients are never left with corrupted state or silent failures

  Background:
    Given I am logged in as a patient and on the booking screen

  @chaos
  Scenario: Network kill mid-booking — app shows error, recovers when network returns
    When wifi is disabled
    And I attempt to book the first available slot
    Then I see a booking error message
    When wifi is restored
    And I attempt to book the first available slot
    Then I see the booking confirmation

  @chaos
  Scenario: Background and foreground mid-flow — booking screen state preserved
    When the app goes to background
    And the app returns to foreground
    Then the booking screen is still visible

  @chaos
  Scenario: Slow network — loading indicator appears before booking completes
    When slow network is applied with 3000ms delay
    And I start booking the first available slot
    Then a loading indicator appears within 1 second
    When slow network is cleared
    Then the booking eventually completes

  @chaos
  Scenario: Force stop and reopen — JWT session persists
    When the app is force stopped and reopened
    Then I am still logged in and the doctors list is visible
