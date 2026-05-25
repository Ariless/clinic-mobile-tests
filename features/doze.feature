Feature: Android Doze mode — app respects battery optimization constraints
  Android Doze restricts background CPU and network access when the device is idle,
  unplugged, and stationary. A well-behaved app must hold no wake locks during Doze
  and show fresh data when the user returns after Doze exits.

  @doze @perf @android
  Scenario: app holds no partial wake locks while the device is in Doze mode
    Given the patient is logged in and the doctors list is visible
    When the device enters Doze mode
    Then the app holds no partial wake locks

  @doze @regression @android
  Scenario: appointment status is not stale after the device exits Doze mode
    Given the patient is logged in and has a pending appointment cached in the UI
    And the app is backgrounded
    When the device enters Doze mode
    And the doctor confirms the appointment via the API while in Doze
    And the device exits Doze mode
    And the app is foregrounded
    Then the appointments list shows the up-to-date confirmed status
