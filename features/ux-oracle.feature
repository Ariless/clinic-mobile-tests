Feature: Claude UX Oracle — patient-centred screen quality evaluation
  As a QA engineer
  I want Claude to evaluate mobile screens from a patient's perspective
  So that UX completeness is verified beyond simple element presence checks

  # Requires ANTHROPIC_API_KEY in .env — all scenarios skip automatically without it
  #
  # Unlike ai-recommend.feature (binary pass/fail), UX oracle returns a 1–5 score
  # and explains what is missing. The assertion threshold is deliberately below 5
  # to tolerate a minimal demo app while still catching genuinely empty screens.

  Background:
    Given I am logged in as a patient

  @ux-oracle @ai
  Scenario: Booking confirmation screen gives patient all pre-appointment information
    When I select the first available doctor
    And I book the first available slot
    And the booking confirmation is visible
    Then the UX oracle rates the booking confirmation at least 4 out of 5 for patient completeness

  @ux-oracle @ai
  Scenario: My Appointments screen gives patient clear actionable next steps
    Given I have a pending appointment via API
    When I open My Visits
    Then the UX oracle rates the appointments list at least 4 out of 5 for patient actionability

  @ux-oracle @ai
  Scenario: Doctors list gives patient enough information to make an informed choice
    Then the UX oracle rates the doctors list at least 3 out of 5 for informed decision support
