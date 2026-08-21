Feature: Touch targets — WCAG 2.5.8 minimum touch target size

  @touch-targets @a11y @android
  Scenario: Login screen interactive elements meet 44dp minimum
    Given the app is at the login screen
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @android
  Scenario: Doctors list interactive elements meet 44dp minimum
    Given I am logged in as a patient
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @android
  Scenario: Booking screen interactive elements meet 44dp minimum
    Given I am logged in as a patient and on the booking screen
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @android
  Scenario: Appointments screen interactive elements meet 44dp minimum
    Given the patient is logged in on mobile and sees My Visits
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @ios
  Scenario: Login screen interactive elements meet 44pt minimum on iOS
    Given the app is at the login screen
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @ios
  Scenario: Doctors list interactive elements meet 44pt minimum on iOS
    Given I am logged in as a patient
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @ios
  Scenario: Booking screen interactive elements meet 44pt minimum on iOS
    Given I am logged in as a patient and on the booking screen
    Then all interactive elements meet the 44dp minimum touch target

  @touch-targets @a11y @ios
  Scenario: Appointments screen interactive elements meet 44pt minimum on iOS
    Given the patient is logged in on mobile and sees My Visits
    Then all interactive elements meet the 44dp minimum touch target
