@permissions @regression @android
Feature: Android Runtime Permissions — revocation and re-grant

  As a QA engineer
  I want to verify the app handles Android 11+ runtime permission changes gracefully
  So that patients with restricted permissions never see a crash

  Scenario: Calendar permission revoked mid-session shows denied message, not crash
    Given I am logged in as a patient
    When I select the first available doctor
    And I book the first available slot
    And "calendar" permission is revoked
    And I tap "Add to Calendar"
    Then the calendar shows a permission denied response

  Scenario: Calendar permission re-granted at runtime restores feature without app restart
    Given I am logged in as a patient
    And "calendar" permission is revoked
    When I select the first available doctor
    And I book the first available slot
    And "calendar" permission is re-granted at runtime
    And I tap "Add to Calendar"
    Then I see "Added to calendar!" confirmation

  Scenario: Microphone permission revoked shows error message, not crash
    Given I am logged in as a patient on the symptom checker tab
    And "microphone" permission is revoked
    When I tap the voice input button without granting mic permission
    Then I see the voice permission error message
