@datetime-locale @regression @android
Feature: Date/time format and timezone per device locale

  # The app uses toLocaleString(undefined, ...) — device locale controls format.
  # Tests assert the displayed slot times follow the expected locale pattern
  # and convert correctly when the device timezone is changed.

  Scenario: Slot times shown in German date format under de-DE locale
    Given the device locale is set to German
    And I am logged in as a patient
    When I open the booking screen for the first doctor
    Then the slot times are not in ISO format
    And the slot times match the de-DE locale format

  Scenario: Slot times shown in US date format under en-US locale
    Given the device locale is set to en-US
    And I am logged in as a patient
    When I open the booking screen for the first doctor
    Then the slot times are not in ISO format
    And the slot times match the en-US locale format

  Scenario: Slot times shift correctly when device timezone is UTC+5
    Given the device timezone is set to UTC+5
    And I am logged in as a patient
    When I open the booking screen for the first doctor
    Then the displayed slot time reflects the UTC+5 offset
