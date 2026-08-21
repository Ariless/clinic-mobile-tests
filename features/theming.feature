Feature: Adaptive theming — dark mode layout integrity
  As a patient using the app in dark mode
  I want all screens to remain readable
  So that I can navigate and use the app without visual issues

  @theming @regression @android @ios
  Scenario: Login screen is readable in dark mode
    Given the device is in dark mode
    And the app is at the login screen
    Then Claude finds no readability issues on the login screen

  @theming @regression @android @ios
  Scenario: Doctors list is readable in dark mode
    Given the device is in dark mode
    And I am logged in as a patient
    Then Claude finds no readability issues on the doctors screen

  @theming @regression @android @ios
  Scenario: Booking screen is readable in dark mode
    Given the device is in dark mode
    And I am logged in as a patient and on the booking screen
    Then Claude finds no readability issues on the booking screen
