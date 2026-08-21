Feature: Integration layer — app handles API error responses gracefully
  mitmproxy stubs a specific endpoint; the real SUT handles all other requests.
  Closes the gap between unit tests (no device) and E2E tests (real SUT always succeeds).

  @integration @regression
  Scenario: booking screen shows error when server returns 500
    Given "POST /api/v1/appointments" is stubbed to return 500
    And the network proxy with stubs is capturing outgoing traffic
    And I am logged in as a patient and on the booking screen
    When I attempt to book the first available slot
    Then I see a booking error message
    And the network proxy is stopped

  @integration @regression
  Scenario: doctors screen shows error when server is unavailable
    Given "GET /api/v1/doctors" is stubbed to return 503
    And the network proxy with stubs is capturing outgoing traffic
    When I log in as a patient through the UI
    Then the doctors screen shows an error
    And the network proxy is stopped

  @integration @regression
  Scenario: appointments screen shows error when server is unavailable
    Given "GET /api/v1/appointments" is stubbed to return 503
    And the network proxy with stubs is capturing outgoing traffic
    And I am logged in as a patient
    And the patient navigates to the appointments tab
    Then the appointments screen shows an error
    And the network proxy is stopped
