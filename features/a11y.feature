Feature: Accessibility — TalkBack screen reader support
  As a patient or doctor with a visual impairment
  I want to use the app with TalkBack screen reader
  So that I can navigate and interact with all features independently

  # TalkBack is enabled AFTER navigating to the target screen so normal
  # Appium interactions (tap, typeText) work during setup. Assertions run
  # with TalkBack active; After hook always disables it.

  @a11y
  Scenario: Login screen form fields are labelled for TalkBack
    Given the app is at the login screen
    When TalkBack is enabled on the device
    Then the login email field has an accessible label
    And the login password field has an accessible label
    And the login submit button has accessible text

  @a11y
  Scenario: Doctors list announces each card with name and specialty
    Given I am logged in as a patient
    When TalkBack is enabled on the device
    Then each visible doctor card is accessible with a name

  @a11y
  Scenario: Booking slots announce time information for screen reader users
    Given I am logged in as a patient
    And I select the first available doctor
    When TalkBack is enabled on the device
    Then each available booking slot has an accessible label
