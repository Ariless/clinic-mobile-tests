Feature: Memory leak detection — heap stability during navigation
  As a QA engineer
  I want to verify the app heap does not grow unboundedly during repeated navigation
  So that production users are protected from OutOfMemoryError crashes

  @perf @memory
  Scenario: Navigation loop 20 times — total PSS growth under 20 MB
    Given the patient is logged in and the doctors list is visible
    And the app heap baseline is recorded
    When I navigate the booking flow 20 times
    Then total PSS growth is under 20 MB

  @perf @memory
  Scenario: Heap growth is not linear — no 10-cycle window adds more than 8 MB
    Given the patient is logged in and the doctors list is visible
    When I navigate the booking flow 30 times and sample heap every 10 cycles
    Then no heap sampling window grew by more than 8 MB
