@pairwise @regression @android
Feature: Pairwise coverage — booking flow across locale × network combinations

  # Device class and Android API are set via AVD configuration (see docs/pairwise-matrix.md).
  # This feature parametrises the two runtime-controllable dimensions: locale and network.
  # Every (locale × network) pair appears at least once — all-pairs coverage for these variables.

  Scenario Outline: Booking completes on <network> network with <locale> locale
    Given the locale is <locale>
    And I am logged in as a patient
    And the network condition is <network>
    When I select the first available doctor
    And I book the first available slot
    Then I see the booking confirmation

    Examples: connected
      | locale | network |
      | en-GB  | fast    |
      | ru-RU  | slow    |
      | ar-SA  | fast    |
      | en-GB  | slow    |
      | ru-RU  | fast    |
      | ar-SA  | slow    |

  @chaos
  Scenario Outline: App shows graceful error when offline — <locale> locale
    Given the locale is <locale>
    And I am logged in as a patient
    And the network condition is offline
    When I select the first available doctor
    And I attempt to book a slot
    Then a booking error is shown and the app has not crashed

    Examples: offline
      | locale |
      | en-GB  |
      | ru-RU  |
      | ar-SA  |
