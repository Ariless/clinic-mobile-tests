Feature: Clinic location map

  @maps @regression @android
  Scenario: Clinic coordinates come from the API, not hardcoded
    Given the patient is logged in and on the doctors screen
    When I tap the map button for the first doctor
    Then the map screen is displayed
    And the clinic address matches the API response for that doctor

  @maps @regression @android
  Scenario: Map screen shows clinic address when offline
    Given the patient is logged in and on the doctors screen
    When the network is disabled
    And I tap the map button for the first doctor
    Then the map screen is displayed
    And the clinic address text is visible

  @maps @regression @android
  Scenario: Directions button does not crash the app
    Given the patient is logged in and on the doctors screen
    When I tap the map button for the first doctor
    And I tap the directions button
    Then the map screen remains responsive
