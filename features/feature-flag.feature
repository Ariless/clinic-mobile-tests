Feature: Feature flag routing — AI recommendation toggle
  As a QA engineer
  I want to verify that the AI Check tab appears only when the flag is ON
  So that broken flag state never silently misleads A/B test metrics

  # ─────────────────────────────────────────────────────────
  # Scenario 1 runs in any environment — it reads /health and
  # asserts that what the API reports matches what the user sees.
  # Scenarios 2 and 3 require the SUT in a specific mode:
  #   flag ON  (default):  ENABLE_AI_RECOMMENDATION=true
  #   flag OFF (explicit): ENABLE_AI_RECOMMENDATION=false
  # ─────────────────────────────────────────────────────────

  @feature-flag @regression
  Scenario: Tab bar reflects the feature flag reported by /health (environment-agnostic)
    Given I am logged in as a patient
    When I check the AI feature flag state from the health endpoint
    Then the AI Check tab visibility matches the feature flag state

  @feature-flag @regression
  Scenario: AI Check tab is visible and functional when flag is ON
    # Requires SUT: ENABLE_AI_RECOMMENDATION=true (default)
    Given I am logged in as a patient
    And the AI recommendation flag is ON
    Then the AI Check tab is visible in the tab bar
    When I open the AI Check tab
    And I submit the symptoms "headache and fever"
    Then I see AI results or a graceful degradation message

  @feature-flag @regression
  Scenario: AI Check tab is hidden when flag is OFF
    # Requires SUT: ENABLE_AI_RECOMMENDATION=false
    Given I am logged in as a patient
    And the AI recommendation flag is OFF
    Then the AI Check tab is not visible in the tab bar
    And only two tabs are shown — Doctors and My Visits
