Feature: Battery drain — app holds no unnecessary wake locks
  Android partial wake locks prevent the CPU from sleeping and drain battery.
  A well-behaved background app must release all wake locks when idle.

  @battery @perf
  Scenario: app holds no partial wake locks while idle after loading
    Given the patient is logged in and the doctors list is visible
    When the app is idle for 3 seconds
    Then the app holds no partial wake locks

  @battery @perf
  Scenario: app releases all wake locks after completing navigation
    Given the patient is logged in and the doctors list is visible
    When I navigate the booking flow 5 times
    Then the app holds no partial wake locks
