@microcopy @ai @regression
Feature: Microcopy quality — patient-appropriate language across screens

  As a patient using a medical booking app
  I want every text on screen to speak my language
  So that I can understand what to do without needing a developer's help

  Scenario: Doctors list uses patient-appropriate language
    Given I am logged in as a patient
    Then Claude rates the "doctors list" screen microcopy at least 4 out of 5

  Scenario: Booking screen CTAs are action-oriented, not developer labels
    Given I am logged in as a patient
    When I select the first available doctor
    Then Claude rates the "booking" screen microcopy at least 4 out of 5

  Scenario: My Visits screen speaks to a patient, not a system
    Given the patient is logged in on mobile and sees My Visits
    Then Claude rates the "my appointments" screen microcopy at least 4 out of 5

  Scenario: Login error avoids technical codes
    Given the app is at the login screen
    When I enter wrong credentials on the login screen
    Then Claude rates the "login error" screen microcopy at least 4 out of 5
