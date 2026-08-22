// Platform-aware page object factory: PLATFORM picks the Android or iOS
// implementation, so step definitions import from here and stay platform-agnostic.

import type { LoginPage as LoginPageType } from './android/LoginPage'
import type { DoctorsPage as DoctorsPageType } from './android/DoctorsPage'
import type { BookingPage as BookingPageType } from './android/BookingPage'
import type { AppointmentsPage as AppointmentsPageType } from './android/AppointmentsPage'
import type { DoctorAppointmentsPage as DoctorAppointmentsPageType } from './android/DoctorAppointmentsPage'
import type { DeepLinkPage as DeepLinkPageType } from './android/DeepLinkPage'
import type { FoldablePage as FoldablePageType } from './android/FoldablePage'
import type { SymptomCheckerPage as SymptomCheckerPageType } from './android/SymptomCheckerPage'
import type { ClinicMapPage as ClinicMapPageType } from './android/ClinicMapPage'
import type { WebViewPage as WebViewPageType } from './android/WebViewPage'
import type { NotificationPage as NotificationPageType } from './android/NotificationPage'

const platform = (process.env.PLATFORM ?? 'android') as 'android' | 'ios'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = platform === 'ios'
  ? require('./ios')
  : require('./android')
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
export { NotificationPage } from './android/NotificationPage'

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
