# FDA SaMD Validation — AI Symptom Checker

**Regulation:** FDA SaMD (Software as a Medical Device) guidance framework  
**Document type:** Validation evidence package — equivalent to EU AI Act compliance (`eu-ai-act.feature`) for US regulatory context  
**SUT:** clinic-mobile AI symptom checker — `POST /api/v1/ai/recommend-doctor`  
**Date:** 2026-05-29  
**Scope:** QA validation perspective. Not a 510(k) submission. Demonstrates the test artifacts a regulated submission would require.

---

## Device description and intended use

**What the software does:**  
Patient describes symptoms in natural language → AI recommends which medical specialty to consult → Patient can book with a specialist or browse all doctors independently.

**Intended user:** Patient (not a clinician). Decision-support only — the patient retains full control over which doctor to book.

**What the software does NOT do:**
- Does not diagnose medical conditions
- Does not prescribe treatment
- Does not replace clinical judgment
- Does not access patient medical records

**Key design constraint:** The system recommends a *specialty* (e.g. "Cardiologist"), not a specific diagnosis (e.g. "heart attack"). This boundary is enforced in the API response schema: `{ specialty, reasoning }` — no ICD codes, no diagnoses.

---

## Risk classification

**Framework:** FDA SaMD Risk Categorization (2019 guidance)

| Dimension | Assessment | Rationale |
|-----------|-----------|-----------|
| Significance of information provided | **Inform** | Output informs a care decision; patient can override via "Browse all doctors" |
| Healthcare situation or condition | **Serious** | Symptoms may indicate serious conditions (chest pain → Cardiologist) |
| **Combined classification** | **Class II** | Inform × Serious = moderate risk |

**Why not Class III (highest):**  
Class III requires "treat or diagnose" function. This system informs a triage decision, not a diagnostic decision. The patient books an appointment — the clinician makes the diagnosis.

**Why not Class I (lowest):**  
Class I applies to "wellness" functions with no plausible serious risk. Misrouting a patient with chest pain to a Dermatologist is a plausible serious outcome — Class I is not appropriate.

**Practical implication for QA:**  
Class II SaMD requires analytical and clinical validation evidence. The sections below provide that evidence for the AI component.

---

## Validation evidence summary

| Requirement | Test | Status | Artifact |
|-------------|------|--------|----------|
| Accuracy on known inputs (golden dataset) | `eu-ai-act.feature @golden-dataset` | ✅ 6/6 canonical pairs pass | `features/eu-ai-act.feature` |
| Consistency (same input → same output) | `eu-ai-act.feature @consistency` | ✅ 3/3 consecutive runs identical | `features/eu-ai-act.feature` |
| Bounded output (output ∈ known set) | `ai.properties.test.ts` contractLayer | ✅ specialty ∈ ALLOWED_SPECIALTIES | `ai-properties/ai.properties.test.ts` |
| Statistical distribution | `ai.properties.test.ts` qualityLayer | ✅ "chest pain" → Cardiologist ≥ 8/10 | `ai-properties/ai.properties.test.ts` |
| Non-determinism bounds (p95 latency) | `ai.properties.test.ts` qualityLayer | ✅ p95 < 3s over 10 runs | `ai-properties/ai.properties.test.ts` |
| Graceful failure on unrecognised input | `eu-ai-act.feature @uncertainty` | ✅ UNKNOWN_SPECIALTY → user message, no crash | `features/eu-ai-act.feature` |
| Hallucination detection | `ai.properties.test.ts` contractLayer | ✅ recommended doctors[] all match returned specialty | `ai-properties/ai.properties.test.ts` |
| Human oversight available | `eu-ai-act.feature @human-oversight` | ✅ Browse All Doctors always accessible | `features/eu-ai-act.feature` |
| Adversarial input robustness | `symptom-checker.feature @security` | ✅ prompt injection → no sensitive data leak, no crash | `features/symptom-checker.feature` |
| Performance under degraded conditions | `symptom-checker.feature` | ✅ gibberish → 422 + patient-appropriate message | `features/symptom-checker.feature` |

---

## Golden dataset — accuracy evidence

**Method:** on-device AI mode (`EXPO_PUBLIC_DEVICE_AI_MODE=ondevice`) uses a deterministic keyword matcher — no LLM non-determinism. Enables reproducible golden dataset testing as required by FDA validation.

**Dataset:** 6 canonical symptom→specialty pairs covering the 6 supported specialties.

| Input symptoms | Expected specialty | Pass/Fail |
|----------------|--------------------|-----------|
| chest pain and shortness of breath | Cardiologist | ✅ |
| severe headache and dizziness | Neurologist | ✅ |
| skin rash and itching | Dermatologist | ✅ |
| knee pain and joint swelling | Orthopedist | ✅ |
| fever and cough | General Practitioner | ✅ |
| infant with ear pain | Pediatrician | ✅ |

**Accuracy rate:** 6/6 (100%) on canonical inputs.

**Limitation acknowledged:** 6-pair dataset covers one canonical input per specialty. Real-world validation would require ≥ 100 inputs per specialty with clinician-labelled ground truth. This dataset demonstrates the testing pattern, not clinical-grade accuracy.

---

## Bias audit

**Method:** manual review of golden dataset inputs + ALLOWED_SPECIALTIES set for demographic and linguistic bias.

| Bias dimension | Assessment |
|----------------|-----------|
| Age bias | "infant with ear pain" → Pediatrician intentionally included. Other inputs are age-neutral. |
| Language bias | All inputs English. Non-native speaker phrasing tested via "confused patient" scenario (`symptom-checker.feature @regression`: "hart pain nd shortnss of breth болит грудь" — mixed language, typos → no crash, result or patient-appropriate error). |
| Gender bias | No gender-specific symptoms in golden dataset. Specialty set does not include gender-specific specialties (no OB/GYN, no Urology) — intentional scope limitation. |
| Socioeconomic bias | Out of scope for this SUT. |

**Residual gap:** full bias audit requires ≥ 100 clinician-labelled inputs across demographics. Documented as out of scope for portfolio SUT; pattern demonstrated.

---

## Edge case coverage

| Edge case | How tested | Result |
|-----------|-----------|--------|
| Unrecognised symptoms (gibberish) | `eu-ai-act.feature @uncertainty` | UNKNOWN_SPECIALTY 422, patient message shown |
| Mixed language + typos | `symptom-checker.feature @regression` | No crash, result or patient error |
| Prompt injection attempt | `symptom-checker.feature @security` | No sensitive data leak, no crash, no unexpected booking |
| Empty / extremely short input | Not automated — SUT does not validate minimum length | ⚠️ residual gap: client-side validation only |
| Extremely long input (> 2KB) | `ai.properties.test.ts` — `response size < 2KB` asserts output bound, not input | ⚠️ residual gap: no max-length input test |
| Feature disabled | `symptom-checker.feature` — `FEATURE_DISABLED` errorCode → degradation message | ✅ |

---

## Auditability

FDA SaMD guidance requires that the software's AI outputs be traceable and that the AI behaviour be auditable over time.

**What exists:**

| Mechanism | Implementation |
|-----------|--------------|
| AI reasoning exposed to user | `symptom-reasoning` testID — AI explains why specialty was chosen; `eu-ai-act.feature @transparency` asserts it is non-empty |
| Output schema constrained | ALLOWED_SPECIALTIES constant — 6 valid values, anything else → UNKNOWN_SPECIALTY 422 |
| On-device deterministic mode | `onDeviceRecommender.ts` keyword matcher — fully auditable, no LLM black box |
| Human override always available | `ai-browse-all-button` — patient can ignore AI output; tested in `@human-oversight` scenario |
| Statistical drift monitoring | `ai.properties.test.ts` qualityLayer — "chest pain" → Cardiologist ≥ 8/10; flags model drift if distribution shifts |

**Residual gap:** no automated model versioning or drift alert pipeline. In a production SaMD this would be a continuous monitoring requirement. For this SUT, the statistical test in CI provides a point-in-time signal; production drift monitoring is acknowledged as out of scope.

---

## Comparison: FDA SaMD vs EU AI Act

Both frameworks apply to this system. The tests were written to satisfy EU AI Act (Art. 13/14/15). The table below maps each FDA requirement to the existing test evidence.

| FDA SaMD requirement | EU AI Act equivalent | Test artifact |
|---------------------|---------------------|---------------|
| Accuracy validation (golden dataset) | Art. 15 — Accuracy | `@golden-dataset` |
| Intended use and limitations documented | Art. 13 — Transparency | `@transparency` + this document |
| Human oversight mechanism | Art. 14 — Human Oversight | `@human-oversight` |
| Consistent output | Art. 15 — Robustness | `@consistency` |
| Failure mode documentation | Art. 15 — Resilience | `@uncertainty` |
| Post-market monitoring plan | Art. 72 — Post-market monitoring | `ai.properties.test.ts` qualityLayer (point-in-time drift signal) |

**Conclusion:** the existing EU AI Act test suite provides evidence for the majority of FDA Class II SaMD analytical validation requirements. A full FDA submission would additionally require clinical validation evidence (clinician-labelled dataset, IRB-approved study) which is out of scope for this learning SUT.
