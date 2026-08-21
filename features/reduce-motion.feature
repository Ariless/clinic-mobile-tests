@reduce-motion @a11y @regression
Feature: Reduce Motion — WCAG 2.3.3 vestibular accessibility

  As a patient with vestibular disorders (migraine, BPPV)
  I want the app to communicate results through static text and icons
  So that I can book appointments safely without motion-triggered symptoms

  @android
  Scenario: Booking confirmation communicates success without relying on animation
    Given Reduce Motion is enabled on the device
    And I am logged in as a patient
    When I select the first available doctor
    And I book the first available slot
    Then the booking confirmation shows text and a visual indicator

  @android
  Scenario: App screens are navigable with Reduce Motion enabled
    Given Reduce Motion is enabled on the device
    And I am logged in as a patient
    Then doctor cards are visible and interactive

  @android
  Scenario: My Visits screen is navigable with Reduce Motion enabled
    Given Reduce Motion is enabled on the device
    And the patient is logged in on mobile and sees My Visits
    Then the appointments list is visible

  @ios
  Scenario: Booking confirmation communicates success without relying on animation on iOS
    Given Reduce Motion is enabled on the device
    And I am logged in as a patient
    When I select the first available doctor
    And I book the first available slot
    Then the booking confirmation shows text and a visual indicator
