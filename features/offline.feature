Feature: Offline mode — cached data and sync on reconnect
  As a patient
  I want to see my doctors and appointments when I have no network
  So that I can check my schedule even without a connection

  Background:
    Given the patient is logged in and has browsed the doctors list
    And the patient has at least one appointment

  @offline @regression
  Scenario: Doctors list is served from cache when offline
    Given the network is disabled
    When the app is cold launched
    And the patient navigates to the doctors tab
    Then the offline banner is visible
    And the doctors list shows previously seen doctors

  @offline @regression
  Scenario: Appointments list is served from cache when offline
    Given the network is disabled
    When the app is cold launched
    And the patient navigates to the appointments tab
    Then the offline banner is visible
    And the appointments list shows previously seen appointments

  @offline @regression
  Scenario: Cancel is blocked with an error message when offline
    Given the network is disabled
    When the app is cold launched
    And the patient navigates to the appointments tab
    And the patient attempts to cancel an appointment
    Then an error message indicates no connection

  @offline @regression
  Scenario: Appointment shows confirmed status after doctor acts while patient was offline
    Given the network is disabled
    And the app is cold launched
    And the patient navigates to the appointments tab
    When the patient attempts to cancel an appointment
    Then an error message indicates no connection
    When the doctor confirms the appointment via the API
    And the network is restored
    And the app is backgrounded
    And the app is foregrounded
    And the patient navigates to the appointments tab
    Then the appointment status shows as confirmed

  @offline @regression
  Scenario: Data refreshes automatically when connection is restored
    Given the network is disabled
    And the app is cold launched
    And the patient navigates to the doctors tab
    And the offline banner is visible
    When the app is backgrounded
    And the network is restored
    And the app is foregrounded
    Then the offline banner disappears
    And the doctors list is refreshed from the server
