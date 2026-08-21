@string-overflow @a11y @regression @android
Feature: String overflow — layout integrity with long-locale text

  # German text is 30–40% longer than English ("Book Appointment" → "Arzttermin buchen").
  # Hardcoded button widths and single-line labels break silently in long locales.
  # These tests run with device locale set to de-DE and use Claude Vision to detect
  # truncated labels, overflowing text, and hidden UI elements.

  Scenario: Doctors list shows no truncated text in German locale
    Given the device locale is set to German
    And I am logged in as a patient
    Then Claude finds no string overflow on the "doctors list" screen

  Scenario: Booking screen shows no truncated text in German locale
    Given the device locale is set to German
    And I am logged in as a patient
    When I select the first available doctor
    Then Claude finds no string overflow on the "booking" screen

  Scenario: My Appointments shows no truncated text in German locale
    Given the device locale is set to German
    And I am logged in as a patient
    When the patient navigates to the appointments tab
    Then Claude finds no string overflow on the "appointments" screen
