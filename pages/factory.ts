// Platform-aware factory for the course-2 private repo.
// Base page objects come from clinic-mobile-tests; SymptomCheckerPage is the
// extended version from this repo (adds voice + on-device AI methods).

import type { LoginPage as LoginPageType } from '../../clinic-mobile-tests/pages/android/LoginPage'
import type { DoctorsPage as DoctorsPageType } from '../../clinic-mobile-tests/pages/android/DoctorsPage'
import type { BookingPage as BookingPageType } from '../../clinic-mobile-tests/pages/android/BookingPage'
import type { AppointmentsPage as AppointmentsPageType } from '../../clinic-mobile-tests/pages/android/AppointmentsPage'
import type { DoctorAppointmentsPage as DoctorAppointmentsPageType } from '../../clinic-mobile-tests/pages/android/DoctorAppointmentsPage'
import type { DeepLinkPage as DeepLinkPageType } from '../../clinic-mobile-tests/pages/android/DeepLinkPage'
import type { FoldablePage as FoldablePageType } from '../../clinic-mobile-tests/pages/android/FoldablePage'
import type { SymptomCheckerPage as SymptomCheckerPageType } from './android/SymptomCheckerPage'
import type { ClinicMapPage as ClinicMapPageType } from './android/ClinicMapPage'
import type { WebViewPage as WebViewPageType } from './android/WebViewPage'
import type { NotificationPage as NotificationPageType } from '../../clinic-mobile-tests/pages/android/NotificationPage'

const platform = (process.env.PLATFORM ?? 'android') as 'android' | 'ios'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = platform === 'ios'
  ? require('../../clinic-mobile-tests/pages/ios')
  : require('../../clinic-mobile-tests/pages/android')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const local = platform === 'ios'
  ? require('./ios')
  : require('./android')

export const LoginPage: typeof LoginPageType = base.LoginPage
export const DoctorsPage: typeof DoctorsPageType = base.DoctorsPage
export const BookingPage: typeof BookingPageType = base.BookingPage
export const AppointmentsPage: typeof AppointmentsPageType = base.AppointmentsPage
export const DoctorAppointmentsPage: typeof DoctorAppointmentsPageType = base.DoctorAppointmentsPage
export const DeepLinkPage: typeof DeepLinkPageType = base.DeepLinkPage
export const FoldablePage: typeof FoldablePageType = base.FoldablePage
export const SymptomCheckerPage: typeof SymptomCheckerPageType = local.SymptomCheckerPage
export const ClinicMapPage: typeof ClinicMapPageType = local.ClinicMapPage
export const WebViewPage: typeof WebViewPageType = local.WebViewPage
// NotificationPage is Android-only — loaded directly from base repo
export { NotificationPage } from '../../clinic-mobile-tests/pages/android/NotificationPage'

export type LoginPage = InstanceType<typeof LoginPageType>
export type DoctorsPage = InstanceType<typeof DoctorsPageType>
export type BookingPage = InstanceType<typeof BookingPageType>
export type AppointmentsPage = InstanceType<typeof AppointmentsPageType>
export type DoctorAppointmentsPage = InstanceType<typeof DoctorAppointmentsPageType>
export type DeepLinkPage = InstanceType<typeof DeepLinkPageType>
export type FoldablePage = InstanceType<typeof FoldablePageType>
export type SymptomCheckerPage = InstanceType<typeof SymptomCheckerPageType>
export type ClinicMapPage = InstanceType<typeof ClinicMapPageType>
export type WebViewPage = InstanceType<typeof WebViewPageType>
// NotificationPage type is inferred from the re-export above
