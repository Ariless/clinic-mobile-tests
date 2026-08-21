Feature: Security — sensitive data does not leak into device logs
  As a QA engineer
  I want to verify that the app never writes sensitive data to logcat
  So that a stolen device or ADB connection cannot expose patient credentials or tokens

  @security @android
  Scenario: JWT token does not appear in logcat during login
    Given the logcat buffer is cleared
    When the patient authenticates via the login screen
    Then device logs contain no JWT-shaped strings

  @security @android
  Scenario: Patient credentials do not appear in logcat during booking flow
    Given the logcat buffer is cleared
    When the patient authenticates and completes a booking
    Then device logs contain no plain-text passwords or email addresses

  @security @android
  Scenario: Android backup is disabled to prevent silent HIPAA data exposure
    Given the app is installed on the device
    Then the installed APK manifest declares allowBackup as false

  @security @android
  Scenario: Third-party analytics requests do not contain patient PII
    Given the network proxy is capturing outgoing traffic
    When the patient authenticates and completes a booking
    Then no third-party analytics request contains patient PII
    And the network proxy is stopped

  @security @android
  Scenario: APK binary contains no hardcoded secrets or API keys
    Given the app is installed on the device
    Then the decompiled APK contains no secret-shaped strings

  @security
  Scenario: Logout invalidates the token server-side so a copied token cannot be reused
    Given a patient is logged in via the API and their token is saved
    When the patient logs out via the API
    Then the saved token is rejected with 401 on any authenticated endpoint
    And the token remains invalid after re-login with the same credentials
