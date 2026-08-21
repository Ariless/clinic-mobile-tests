@notifications @android
Feature: Push notifications for appointment events

  Background:
    Given the patient is logged in

  Scenario: Booking triggers a notification with meaningful text
    When the patient books an appointment with the first available doctor
    Then a notification appears with the doctor name in the message
    And the notification title is "Booking confirmed"

  Scenario: Tapping a booking notification opens the appointment detail
    When the patient books an appointment with the first available doctor
    And the patient taps the booking notification
    Then the appointment detail screen is shown
    And the appointment status is "pending"

  Scenario: Notification arrives while app is in background
    Given the patient has booked an appointment via API
    And the app is sent to the background
    When the booking notification is triggered manually
    Then the notification shade contains the appointment text
    And returning to the app shows the appointments screen
