@rtl @a11y @regression @android
Feature: RTL layout — correct mirroring for Arabic locale

  As an Arabic-speaking patient
  I want the app layout to be correctly mirrored right-to-left
  So that I can navigate and book appointments naturally

  Scenario: Doctors list is correctly mirrored for RTL
    Given the device locale is set to Arabic
    And I am logged in as a patient
    Then Claude confirms the RTL layout is correct on the "doctors list" screen

  Scenario: Booking screen is correctly mirrored for RTL
    Given the device locale is set to Arabic
    And I am logged in as a patient
    When I select the first available doctor
    Then Claude confirms the RTL layout is correct on the "booking" screen
