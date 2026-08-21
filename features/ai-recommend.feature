Feature: AI test patterns — Claude Vision and accessibility audit
  As a QA engineer
  I want to use Claude to evaluate screens semantically
  So that visual assertions survive device density changes and don't require pixel-perfect snapshots

  # Requires ANTHROPIC_API_KEY in .env
  # Skipped automatically when key is absent

  Background:
    Given I am logged in as a patient

  @ai
  Scenario: Booking confirmation screen passes Claude Vision semantic check
    When I select the first available doctor
    And I book the first available slot
    And the booking confirmation is visible
    Then Claude confirms the screen shows a successful appointment booking

  @ai
  Scenario: Appointments list screen passes Claude Vision semantic check
    Given I have a pending appointment via API
    When I open My Visits
    Then Claude confirms the screen shows an appointment list with at least one entry

  @ai
  Scenario: Booking screen has no unlabeled interactive elements — non-determinism guard
    When I select the first available doctor
    Then the booking screen has no consistently unlabeled interactive elements across 3 checks
