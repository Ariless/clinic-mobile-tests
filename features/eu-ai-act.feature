@eu-ai-act @compliance
Feature: EU AI Act compliance — medical AI high-risk system requirements

  # Medical AI recommendation = HIGH RISK under EU AI Act (Art. 6, Annex III)
  # Applicable from August 2026. Tested requirements:
  #   Art. 13 — Transparency: users informed they interact with AI
  #   Art. 14 — Human oversight: meaningful ability to override AI output
  #   Art. 15 — Accuracy: tested against a golden dataset of known symptom→specialty pairs
  #
  # Golden dataset scenarios require on-device AI mode (deterministic, no network).
  # Scenarios tagged @ondevice skip automatically if the ondevice badge is absent.

  Background:
    Given I am logged in as a patient on the symptom checker tab

  @transparency
  Scenario: AI disclosure notice is visible before any interaction
    Then the AI disclosure banner is visible on screen

  @transparency
  Scenario: AI reasoning is shown to the patient after a recommendation
    When the patient enters symptoms "chest pain" and submits
    Then the AI reasoning text is visible and non-empty

  @human-oversight
  Scenario: Patient can browse all doctors regardless of AI recommendation
    When the patient enters symptoms "headache" and submits
    Then the browse-all-doctors button is visible in the result
    When the patient taps browse all doctors
    Then the doctors list screen is visible

  @accuracy @golden-dataset @ondevice
  Scenario Outline: On-device AI maps canonical symptoms to expected specialty
    Given on-device AI mode is active
    When the patient enters symptoms "<symptoms>" and submits
    Then the recommended specialty is "<expected_specialty>"

    Examples:
      | symptoms                           | expected_specialty   |
      | chest pain and shortness of breath | Cardiologist         |
      | severe headache and dizziness      | Neurologist          |
      | skin rash and itching              | Dermatologist        |
      | knee pain and joint swelling       | Orthopedist          |
      | fever and cough                    | General Practitioner |
      | infant with ear pain               | Pediatrician         |

  @consistency @ondevice
  Scenario: Same symptoms produce consistent output across three consecutive runs
    Given on-device AI mode is active
    When the patient submits symptoms "chest pain" three times in a row
    Then all three recommendations are identical

  @uncertainty
  Scenario: Unrecognised symptoms produce a patient-appropriate error message
    When the patient enters symptoms "xkzqwmpl blargh frobnitz" and submits
    Then a patient-appropriate error message is shown
    And the app has not crashed
