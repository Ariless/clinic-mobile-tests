@friction @ai @regression
Feature: User journey friction analysis — booking flow

  As a product team
  I want to understand which step of the booking flow causes the most friction
  So that I can prioritise UX improvements before they cause patient drop-off

  Scenario: No step in the booking flow has high friction
    Given I am logged in as a patient
    When I capture screenshots through the full booking flow
    Then no step in the journey has a friction score above 3 out of 5
