Feature: N+1 request detection — each screen makes exactly one API call per trigger
  Network proxy captures all HTTP traffic; assert no redundant calls on mount or AppState resume.

  @n-plus-one @regression
  Scenario: DoctorsScreen makes exactly one GET /doctors on initial load
    Given the network proxy is capturing outgoing traffic
    And I am logged in as a patient
    Then exactly 1 request was made to GET /api/v1/doctors
    And the network proxy is stopped

  @n-plus-one @regression
  Scenario: DoctorsScreen makes exactly one GET /doctors when app returns from background
    Given I am logged in as a patient
    And the network proxy is capturing outgoing traffic after app load
    When I send the app to background and bring it to foreground
    Then exactly 1 request was made to GET /api/v1/doctors
    And the network proxy is stopped

  @n-plus-one @regression
  Scenario: AppointmentsScreen makes exactly one GET /appointments on AppState resume
    Given I am logged in as a patient
    And the patient navigates to the appointments tab
    And the network proxy is capturing outgoing traffic after app load
    When I send the app to background and bring it to foreground
    Then exactly 1 request was made to GET /api/v1/appointments
    And the network proxy is stopped
