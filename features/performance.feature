Feature: Performance — cold start and frame rate gates
  As a QA engineer
  I want to measure and gate launch time and scroll smoothness
  So that no change accidentally ships a slow or janky experience to patients

  @perf
  Scenario: App cold start completes within 2000ms
    Given the app is fully stopped
    When the app is cold launched
    Then total launch time is under 2000 milliseconds

  @perf
  Scenario: Scrolling the doctors list produces less than 5% janky frames
    Given the patient is logged in and the doctors list is visible
    And gfxinfo stats are reset
    When the doctors list is scrolled 5 times
    Then janky frame rate is under 5 percent
