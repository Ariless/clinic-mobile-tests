@contrast @a11y @regression @android
Feature: WCAG 2.2 contrast ratio — all text meets AA minimum

  # Colors are extracted from SUT StyleSheet constants.
  # Contrast ratio is calculated via WCAG 2.2 relative luminance formula.
  # Appium screenshot attached to Allure as visual evidence.
  # AA thresholds: 4.5:1 normal text, 3:1 large text (≥18pt or ≥14pt bold).

  Scenario: Login screen color pairs meet WCAG AA contrast
    Given I am on the login screen
    Then all login screen color pairs meet WCAG AA contrast

  Scenario: Appointments screen status badges meet WCAG AA contrast
    Given I am logged in as a patient
    And I have a pending appointment
    When I open My Visits
    Then all appointments screen color pairs meet WCAG AA contrast

  Scenario: Doctors screen color pairs meet WCAG AA contrast
    Given I am logged in as a patient
    Then all doctors screen color pairs meet WCAG AA contrast
