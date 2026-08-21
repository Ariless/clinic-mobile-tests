@analytics-ab @ai @regression
Feature: Analytics A/B events — correct events per group

  # Group A (ENABLE_AI_RECOMMENDATION=false): patient books via manual doctor selection
  #   Expected: [analytics] booking_manual
  #   Not expected: ai_recommendation_used, booking_ai
  #
  # Group B (ENABLE_AI_RECOMMENDATION=true): patient books via AI recommendation
  #   Expected: [analytics] ai_recommendation_used, [analytics] booking_ai
  #   Not expected: booking_manual
  #
  # Events are logged via console.log('[analytics]', event) and read from ADB logcat.
  # If events are swapped, A/B test data is corrupted — PM sees wrong signal.

  @android
  Scenario: Group A — manual booking fires booking_manual event
    Given the logcat buffer is cleared
    And I am logged in as a patient
    When I select the first available doctor
    And I book the first available slot
    Then logcat contains the analytics event "booking_manual"
    And logcat does not contain the analytics event "booking_ai"
    And logcat does not contain the analytics event "ai_recommendation_used"

  @android
  Scenario: Group B — AI booking fires ai_recommendation_used and booking_ai events
    Given the logcat buffer is cleared
    And I am logged in as a patient
    When I navigate to the AI symptom checker
    And I describe symptoms "chest pain"
    And I submit the symptom check
    And I select the first doctor from AI results
    And I book the first available slot
    Then logcat contains the analytics event "ai_recommendation_used"
    And logcat contains the analytics event "booking_ai"
    And logcat does not contain the analytics event "booking_manual"
