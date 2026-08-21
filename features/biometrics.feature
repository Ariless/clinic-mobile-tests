@biometrics @android @regression
Feature: Biometric authentication — success, failure, and fallback

  # EXPO_PUBLIC_TEST_BIOMETRIC=success|fail|unavailable controls the biometric result.
  # The biometric button is visible only when the device has hardware, is enrolled,
  # and a prior session token exists in AsyncStorage.

  Scenario: Successful biometric login authenticates the patient
    Given a patient has previously logged in with credentials
    And biometric authentication is available on the device
    When the patient taps the biometric login button
    And biometric authentication succeeds
    Then the patient sees the doctors list

  Scenario: Three failed biometric attempts hide the button and show PIN fallback
    Given a patient has previously logged in with credentials
    And biometric authentication is available on the device
    When the patient fails biometric authentication 3 times
    Then the biometric login button is no longer visible
    And the password login form is shown

  Scenario: Biometrics unavailable shows password-only UI
    Given a patient has previously logged in with credentials
    And biometric authentication is not available on the device
    Then the biometric login button is not shown
    And the login form is visible
