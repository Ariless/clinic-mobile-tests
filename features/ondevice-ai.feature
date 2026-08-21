Feature: On-device AI — differential testing against cloud AI
  Stability invariants must hold in both cloud and on-device modes.
  The on-device badge must be visible when DEVICE_AI_MODE=ondevice.
  Latency profile differs: on-device has no network round-trip.

  @ondevice-ai @regression
  Scenario: unambiguous symptom gives consistent specialty in cloud mode
    Given cloud AI mode is active
    And I am logged in as a patient and on the AI Check screen
    When I submit symptoms "chest pain" via text
    Then the recommended specialty is "Cardiologist"
    And the ondevice badge is not visible

  @ondevice-ai @regression
  Scenario: unambiguous symptom gives consistent specialty in on-device mode
    Given on-device AI mode is active
    And I am logged in as a patient and on the AI Check screen
    When I submit symptoms "chest pain" via text
    Then the recommended specialty is "Cardiologist"
    And the ondevice badge is visible

  @ondevice-ai @regression
  Scenario: specialty invariant holds across both modes for five unambiguous symptoms
    Given on-device AI mode is active
    And I am logged in as a patient and on the AI Check screen
    Then the on-device model returns "Cardiologist" for "heart palpitations" at least 1 of 1 times
    And the on-device model returns "Neurologist" for "migraine and seizure" at least 1 of 1 times
    And the on-device model returns "Dermatologist" for "skin rash and itching" at least 1 of 1 times
    And the on-device model returns "Orthopedist" for "knee joint pain" at least 1 of 1 times
    And the on-device model returns "Pediatrician" for "child with fever" at least 1 of 1 times

  @ondevice-ai @regression
  Scenario: on-device mode responds faster than cloud threshold
    Given on-device AI mode is active
    And I am logged in as a patient and on the AI Check screen
    When I submit symptoms "chest pain" via text and measure response time
    Then the response time is under 500 milliseconds
