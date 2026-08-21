@qr @android @regression
Feature: QR code scanning — appointment deep link via camera

  # QR codes contain clinic://appointment/{id} deep links.
  # In test mode EXPO_PUBLIC_TEST_QR_VALUE bypasses the real camera.
  # This is the same pattern as EXPO_PUBLIC_TEST_VOICE_TEXT for Voice AI.

  Scenario: Valid QR navigates to appointment detail screen
    Given I am logged in as a patient
    And I have a pending appointment for QR scanning
    When I open the QR scanner with a valid appointment QR
    Then the appointment detail screen is shown
    And the appointment detail loads without error

  Scenario: Offline QR scan shows graceful error
    Given I am logged in as a patient
    And I have a pending appointment for QR scanning
    And the device is offline
    When I open the QR scanner with a valid appointment QR
    Then a patient-appropriate error is shown on the detail screen
    And the app has not crashed

  Scenario: Cancelled appointment QR shows graceful error
    Given I am logged in as a patient
    And I have a pending appointment for QR scanning
    And the appointment has been cancelled via API
    When I open the QR scanner with that appointment QR
    Then the appointment detail screen is shown
    And the appointment status shown is "cancelled"
