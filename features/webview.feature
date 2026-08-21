Feature: WebView screen — Terms & Conditions and Privacy Policy
  As a patient
  I want to read the Terms & Conditions and Privacy Policy before logging in
  So I can make an informed decision about using the app

  # Context switching pattern:
  # NATIVE_APP context → tap link → WEBVIEW context (HTML content) → back → NATIVE_APP context
  # This is the key Appium competency unlocked by this screen.

  Background:
    Given the app is on the login screen

  @smoke @regression @webview
  Scenario: Terms & Conditions link opens WebView screen
    When I tap the "Terms & Conditions" link
    Then the WebView screen is displayed
    And the WebView title is "Terms & Conditions"

  @regression @webview @ios @android
  Scenario: WebView context switch — assert HTML content then return to native
    When I tap the "Terms & Conditions" link
    And I switch to the WebView context
    Then the web page heading contains "Terms"
    When I switch back to the native context
    Then the WebView back button is visible

  @regression @webview
  Scenario: Back button returns to login screen
    When I tap the "Terms & Conditions" link
    And I press the WebView back button
    Then the login screen is displayed

  @regression @webview
  Scenario: Privacy Policy link opens WebView with correct title
    When I tap the "Privacy Policy" link
    Then the WebView screen is displayed
    And the WebView title is "Privacy Policy"

  @regression @webview @ios @android
  Scenario: Privacy Policy web content is correct
    When I tap the "Privacy Policy" link
    And I switch to the WebView context
    Then the web page heading contains "Privacy"
    When I switch back to the native context
    Then the WebView back button is visible

  # iOS-specific: verifies the app uses WKWebView (not SFSafariViewController).
  # SFSafariViewController runs in a separate process — Appium cannot switch context.
  # If react-native-webview is replaced with Linking.openURL(), this test catches it.
  @regression @webview @ios
  Scenario: iOS WKWebView context is accessible — regression guard against SFSafariViewController
    When I tap the "Terms & Conditions" link
    Then the WebView context is accessible via XCUITest
