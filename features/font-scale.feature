@font-scale @a11y @regression @android
Feature: Large font scale — layout integrity at maximum text size

  As a patient with accessibility needs
  I want the app to remain readable at maximum font size
  So that I can book appointments without text being cut off or hidden

  Scenario: Doctors list adapts to maximum font scale without truncation
    Given the device font scale is set to maximum
    And I am logged in as a patient
    Then Claude finds no truncated or overlapping content on the "doctors list" screen

  Scenario: Booking screen adapts to maximum font scale without truncation
    Given the device font scale is set to maximum
    And I am logged in as a patient
    When I select the first available doctor
    Then Claude finds no truncated or overlapping content on the "booking" screen

  Scenario: My Visits adapts to maximum font scale without truncation
    Given the device font scale is set to maximum
    And the patient is logged in on mobile and sees My Visits
    Then Claude finds no truncated or overlapping content on the "my visits" screen
