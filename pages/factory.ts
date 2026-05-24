// Platform-aware page object factory.
// Step-definitions import from here — never directly from pages/android/ or pages/ios/.
// PLATFORM env var is set by wdio.conf.ts before any step runs.

import type { LoginPage as LoginPageType } from './android/LoginPage'
import type { DoctorsPage as DoctorsPageType } from './android/DoctorsPage'
import type { BookingPage as BookingPageType } from './android/BookingPage'
import type { AppointmentsPage as AppointmentsPageType } from './android/AppointmentsPage'
import type { DoctorAppointmentsPage as DoctorAppointmentsPageType } from './android/DoctorAppointmentsPage'
import type { SymptomCheckerPage as SymptomCheckerPageType } from './android/SymptomCheckerPage'
import type { DeepLinkPage as DeepLinkPageType } from './android/DeepLinkPage'

const platform = (process.env.PLATFORM ?? 'android') as 'android' | 'ios'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const p = platform === 'ios' ? require('./ios') : require('./android')

export const LoginPage: typeof LoginPageType = p.LoginPage
export const DoctorsPage: typeof DoctorsPageType = p.DoctorsPage
export const BookingPage: typeof BookingPageType = p.BookingPage
export const AppointmentsPage: typeof AppointmentsPageType = p.AppointmentsPage
export const DoctorAppointmentsPage: typeof DoctorAppointmentsPageType = p.DoctorAppointmentsPage
export const SymptomCheckerPage: typeof SymptomCheckerPageType = p.SymptomCheckerPage
export const DeepLinkPage: typeof DeepLinkPageType = p.DeepLinkPage

// Instance types — allow step-definitions to use page objects as type annotations
export type LoginPage = InstanceType<typeof LoginPageType>
export type DoctorsPage = InstanceType<typeof DoctorsPageType>
export type BookingPage = InstanceType<typeof BookingPageType>
export type AppointmentsPage = InstanceType<typeof AppointmentsPageType>
export type DoctorAppointmentsPage = InstanceType<typeof DoctorAppointmentsPageType>
export type SymptomCheckerPage = InstanceType<typeof SymptomCheckerPageType>
export type DeepLinkPage = InstanceType<typeof DeepLinkPageType>
