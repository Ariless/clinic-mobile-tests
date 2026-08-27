@eu-ai-act @compliance
Feature: EU AI Act compliance — medical AI high-risk system requirements

  # Medical AI recommendation is treated here as a HIGH RISK system (Art. 6). Tested requirements,
  # all from Chapter III:
  #   Art. 13 — Transparency: users informed they interact with AI
  #   Art. 14 — Human oversight: meaningful ability to override AI output
  #   Art. 15 — Accuracy: tested against a golden dataset of known symptom→specialty pairs
  #
  # Dates, corrected 2026-08-27. This used to read "Applicable from August 2026", which was true when
  # written and is not any more: the Digital Omnibus on AI entered into force on 2026-07-27 and moved
  # the Chapter III obligations for standalone Annex III systems from 2026-08-02 to **2027-12-02**;
  # for AI embedded in products already regulated under Annex I, to 2028-08-02. What did NOT move:
  # the Art. 50 transparency and AI-content-labelling duties, the GPAI provider obligations, and the
  # Art. 5 prohibited-practices regime.
  #
  # Which of the two Annexes a symptom-triage feature falls under is a classification question this
  # project has not answered — a medical device under MDR points at Annex I, a service-access
  # decision points at Annex III. The tests below do not depend on the answer: they assert the
  # behaviour, and the deadline only decides when it becomes obligatory rather than good practice.
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
