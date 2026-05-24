import * as dotenv from 'dotenv'
dotenv.config()

// Host-side URL — test runner calls the API directly, not through the emulator
const BASE_URL = process.env.API_HOST_URL ?? 'http://localhost:3000/api/v1'

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json() as T
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as T
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function patch<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json() as T
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

type LoginResponse = { token: string; user: { name: string; role: string } }
type Slot = { id: number; startTime: string; isAvailable: boolean }
type Appointment = { id: number; status: string; slotId: number }
type PagedAppointments = { data: Appointment[] }

export const ApiClient = {
  async loginAsPatient(): Promise<string> {
    const res = await post<LoginResponse>('/auth/login', {
      email: process.env.PATIENT_EMAIL ?? 'patient@example.com',
      password: process.env.PATIENT_PASSWORD ?? 'password123',
    })
    return res.token
  },

  async loginAsDoctor(): Promise<string> {
    const res = await post<LoginResponse>('/auth/login', {
      email: process.env.DOCTOR_EMAIL ?? 'doctor@example.com',
      password: process.env.DOCTOR_PASSWORD ?? 'password123',
    })
    return res.token
  },

  async getAvailableSlots(doctorId: number, token: string): Promise<Slot[]> {
    const slots = await get<Slot[]>(`/doctors/${doctorId}/slots`, token)
    return slots.filter(s => s.isAvailable)
  },

  async bookAppointment(slotId: number, token: string): Promise<Appointment> {
    return post<Appointment>('/appointments', { slotId }, token)
  },

  async cancelAppointment(appointmentId: number, token: string): Promise<void> {
    await patch(`/appointments/${appointmentId}/cancel`, {}, token)
  },

  async getMyAppointments(token: string): Promise<Appointment[]> {
    const res = await get<PagedAppointments | Appointment[]>('/appointments/my?limit=50', token)
    return Array.isArray(res) ? res : res.data
  },

  async getFirstDoctorId(token: string): Promise<number> {
    const doctors = await get<{ id: number }[]>('/doctors', token)
    if (!doctors.length) throw new Error('No doctors available in SUT')
    return doctors[0].id
  },

  async bookFirstAvailableSlot(doctorId: number, token: string): Promise<number> {
    const slots = await this.getAvailableSlots(doctorId, token)
    if (!slots.length) throw new Error(`No available slots for doctor ${doctorId}`)
    const appt = await this.bookAppointment(slots[0].id, token)
    return appt.id
  },

  async confirmAppointment(appointmentId: number, token: string): Promise<void> {
    await patch(`/appointments/${appointmentId}/confirm`, {}, token)
  },

  async rejectAppointment(appointmentId: number, token: string): Promise<void> {
    await patch(`/appointments/${appointmentId}/reject`, {}, token)
  },

  async completeAppointment(appointmentId: number, token: string): Promise<void> {
    await patch(`/appointments/${appointmentId}/complete`, {}, token)
  },

  async cancelAppointmentAsDoctor(appointmentId: number, token: string): Promise<void> {
    await patch(`/appointments/${appointmentId}/cancel-as-doctor`, {}, token)
  },

  async getAppointment(appointmentId: number, token: string): Promise<{ id: number; status: string }> {
    return get(`/appointments/${appointmentId}`, token)
  },

  // Non-throwing PATCH — returns the HTTP status code.
  // Use for testing invalid transitions where 4xx is the expected outcome.
  async tryTransition(path: string, token: string): Promise<number> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    return res.status
  },

  async logout(token: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`POST /auth/logout → ${res.status}`)
  },

  async getStatus(path: string, token: string): Promise<number> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.status
  },
}
