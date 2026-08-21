@circuit-breaker @ai @regression
Feature: Circuit breaker — AI service resilience

  # Tests three circuit breaker states on the mobile layer:
  #   CLOSED  — normal operation, requests pass through
  #   OPEN    — after repeated failures, fails fast without timeout
  #   HALF-OPEN — after recovery timeout, one request is allowed through
  #
  # Recovery timeout overridden to 2000ms in test env (CIRCUIT_BREAKER_RECOVERY_MS=2000).
  # Requires ENABLE_DEBUG_ROUTES=true (set in docker-compose.test.yml).

  Background:
    Given the AI circuit breaker is reset

  @android
  Scenario: Closed state — recommendation works normally
    Given I am logged in as a patient
    When I navigate to the AI symptom checker
    And I submit symptoms "chest pain"
    Then the symptom checker shows a recommendation
    And the AI circuit breaker state is "closed"

  @android
  Scenario: Open state — mobile gets immediate graceful degradation without timeout
    Given the AI circuit breaker is forced open
    And I am logged in as a patient
    When I navigate to the AI symptom checker
    And I submit symptoms "chest pain"
    Then the symptom checker shows a patient-appropriate error within 3 seconds
    And the AI circuit breaker state is "open"

  @android
  Scenario: Half-open state — circuit allows one request through after recovery
    Given the AI circuit breaker is forced open
    And the circuit breaker recovery timeout has elapsed
    And I am logged in as a patient
    When I navigate to the AI symptom checker
    And I submit symptoms "chest pain"
    Then the symptom checker shows a recommendation
    And the AI circuit breaker state is "closed"
