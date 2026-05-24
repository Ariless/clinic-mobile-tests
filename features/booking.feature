Feature: Patient booking flow
  As a patient using the mobile app
  I want to book and cancel appointments
  So that I can manage my healthcare visits

  Background:
    Given I am logged in as a patient

  @smoke @regression
  Scenario: Book an appointment with an available doctor
    When I select the first available doctor
    And I book the first available slot
    Then I see the booking confirmation

  @smoke @regression
  Scenario: Booked appointment appears in My Visits with pending status
    When I select the first available doctor
    And I book the first available slot
    And I return to the doctor list
    And I open My Visits
    Then I see my latest appointment with status "pending"

  @smoke @regression
  Scenario: Cancel a pending appointment
    Given I have a pending appointment
    When I open My Visits
    And I cancel my pending appointment
    Then my appointment shows status "cancelled"

  @regression
  Scenario: Booking screen shows the selected doctor name
    When I select the first available doctor
    Then the booking screen shows that doctor's name

  @regression
  Scenario: No available slots shows empty state
    Given no slots are available for the first doctor
    When I select the first available doctor
    Then I see "No available slots"
