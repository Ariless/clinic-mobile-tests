Feature: Foldable and large-screen layout
  As a patient using the app on a foldable or tablet
  I want the doctors list and booking panel to appear side by side
  So that I can browse and book without navigating between screens

  @foldable @regression @android
  Scenario: Dual-panel layout is shown on a large screen
    Given I am logged in as a patient
    When the device is expanded to large-screen size
    Then the dual-panel container is visible
    And the doctors panel is visible
    And the booking placeholder is visible

  @foldable @regression @android
  Scenario: Selecting a doctor in the panel shows the booking area
    Given I am logged in as a patient
    And the device is expanded to large-screen size
    When I select the first doctor in the large-screen panel
    Then the booking panel is visible
    And the doctors panel is still visible

  @foldable @regression @android
  Scenario: Folding the device hides the dual-panel layout
    Given I am logged in as a patient
    And the device is expanded to large-screen size
    When the device is folded to phone size
    Then the dual-panel container is not visible
    And the doctors list is visible

  @foldable @ai @android
  Scenario: Claude Vision confirms the dual-panel layout is usable
    Given I am logged in as a patient
    And the device is expanded to large-screen size
    When I take a screenshot of the large-screen layout
    Then Claude confirms the dual-panel layout is usable
