Feature: Calendar integration
  As a patient
  I want to add my appointments to the device calendar
  So I don't miss my scheduled visits

  # Requires: autoGrantPermissions: true (Android) / autoAcceptAlerts: true (iOS)
  # — both are set in wdio.conf.ts, so the system calendar permission dialog
  #   is auto-accepted without manual intervention.

  Background:
    Given I am logged in as a patient

  @smoke @regression @calendar
  Scenario: Add to Calendar button appears after successful booking
    When I select the first available doctor
    And I book the first available slot
    Then I see the booking confirmation
    And the "Add to Calendar" button is visible

  @regression @calendar
  Scenario: Tapping Add to Calendar adds the event and shows confirmation
    When I select the first available doctor
    And I book the first available slot
    And I tap "Add to Calendar"
    Then I see "Added to calendar!" confirmation
    And the "Add to Calendar" button is no longer visible

  # NOTE: 'exists' (Already in calendar) is tested at unit level only.
  # Each booking creates a new appointmentId, so a second booking would call
  # addToCalendar with a different ID and return 'added', not 'exists'.
  # The idempotency guard exists to prevent duplicates if the success screen
  # is somehow re-rendered for the same appointment — not achievable via Appium.
