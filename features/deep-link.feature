Feature: Deep links — clinic:// URI scheme opens the correct appointment screen
  Android VIEW intents with the clinic:// scheme must route directly to the
  appointment detail screen for authenticated users. Invalid IDs must be handled
  gracefully. Unauthenticated users must see login, not a crash or blank screen.

  @deeplink @regression @android
  Scenario: valid deep link navigates authenticated user to appointment detail
    Given the patient is logged in and has a booking
    When a deep link to the patient's appointment is opened
    Then the appointment detail screen is shown with the correct appointment

  @deeplink @regression @android
  Scenario: invalid appointment ID in deep link shows a not-found error
    Given the patient is logged in and has a booking
    When a deep link to appointment 999999 is opened
    Then the appointment detail screen shows a not-found error

  @deeplink @regression @android
  Scenario: deep link without a session redirects to login
    Given the app has no stored session
    When a deep link to appointment 1 is opened
    Then the login screen is shown instead of the appointment
