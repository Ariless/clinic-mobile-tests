@empty-states @ai @regression
Feature: Empty state completeness — patient guidance when no content exists

  As a patient with no appointments
  I want the app to explain what is empty and what I can do next
  So that I do not think the app is broken and abandon it

  Scenario: My Visits empty state guides the patient toward booking
    Given the patient has no appointments
    When I open My Visits
    Then Claude rates the "My Visits" empty state guidance at least 4 out of 5
