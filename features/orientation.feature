Feature: Portrait/landscape rotation — layout stability mid-flow

  @orientation @regression
  Scenario: Rotating to landscape mid-booking keeps the booking screen intact
    Given I am logged in as a patient and on the booking screen
    When the device is rotated to landscape
    Then the booking screen is still visible
    And no booking error is shown
    When the device is rotated back to portrait
    Then the booking screen is still visible

  @orientation @regression
  Scenario: Rotating mid-doctors-list does not reset to login
    Given I am logged in as a patient
    When the device is rotated to landscape
    Then I am still logged in and the doctors list is visible
    When the device is rotated back to portrait
    Then I am still logged in and the doctors list is visible
