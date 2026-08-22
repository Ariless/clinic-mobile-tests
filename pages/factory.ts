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
const pages = platform === 'ios'
  ? require('./ios')
  : require('./android')

export const LoginPage: typeof LoginPageType = pages.LoginPage
export const DoctorsPage: typeof DoctorsPageType = pages.DoctorsPage
export const BookingPage: typeof BookingPageType = pages.BookingPage
export const AppointmentsPage: typeof AppointmentsPageType = pages.AppointmentsPage
export const DoctorAppointmentsPage: typeof DoctorAppointmentsPageType = pages.DoctorAppointmentsPage
export const DeepLinkPage: typeof DeepLinkPageType = pages.DeepLinkPage
export const FoldablePage: typeof FoldablePageType = pages.FoldablePage
export const SymptomCheckerPage: typeof SymptomCheckerPageType = pages.SymptomCheckerPage
export const ClinicMapPage: typeof ClinicMapPageType = pages.ClinicMapPage
export const WebViewPage: typeof WebViewPageType = pages.WebViewPage
// NotificationPage is Android-only — re-exported directly, not through the platform switch
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
