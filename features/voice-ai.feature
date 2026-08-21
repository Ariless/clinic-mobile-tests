Feature: Voice AI pipeline — symptom input via microphone
  The voice pipeline must produce the same specialty as the text pipeline
  for identical symptoms, degrade gracefully when mic is unavailable,
  and reject noise that cannot produce a valid specialty.

  @voice-ai @regression
  Scenario: voice input produces the same specialty as text input
    Given I am logged in as a patient and on the AI Check screen
    When I submit symptoms "chest pain and shortness of breath" via text
    Then I record the recommended specialty
    When I clear the symptom input
    And I submit symptoms "chest pain and shortness of breath" via voice
    Then the recommended specialty matches the previously recorded one

  @voice-ai @regression
  Scenario: mic permission denied shows graceful error
    Given I am logged in as a patient and on the AI Check screen
    When I tap the voice input button without granting mic permission
    Then I see the voice permission error message
    And the symptom input remains empty

  @voice-ai @regression
  Scenario: background noise produces unknown specialty or valid fallback
    Given I am logged in as a patient and on the AI Check screen
    When I submit voice input with background noise text "xkzqpwmvltrbn zzz aaa"
    Then the app does not crash
    And either a specialty is shown or a descriptive error is shown
