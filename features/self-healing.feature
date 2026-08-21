Feature: Self-healing locators via Claude Vision

  When a testID is renamed or removed, Claude Vision finds the element visually
  and the test continues without a hard failure.

  Background:
    Given the patient is logged in and the doctors list is visible

  @self-healing @regression
  Scenario: Tap a doctor card when the testID has changed
    When I tap the first doctor card using a stale testID
    Then the booking screen opens

  @self-healing @regression
  Scenario: Tap the logout button when the testID has changed
    When I tap the logout button using a stale testID
    Then the login screen is visible
