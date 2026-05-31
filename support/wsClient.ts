// WebSocket client for event-chain assertions.
// Connects to the SUT WS server at ws://localhost:3000/ws?token=...
// and collects incoming events so tests can assert on them.

import WebSocket from 'ws'

const WS_URL = (process.env.API_HOST_URL ?? 'http://localhost:3000/api/v1')
  .replace(/^http/, 'ws')
  .replace('/api/v1', '')

export interface WsEvent {
  event: string
  appointmentId?: number
  patientId?: number
  status?: string
  timestamp: string
  [key: string]: unknown
}

export class WsClient {
  private ws: WebSocket | null = null
  private received: WsEvent[] = []
  private token: string

  constructor(token: string) {
    this.token = token
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}/ws?token=${this.token}`)
      this.ws.on('open', () => resolve())
      this.ws.on('error', reject)
      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString()) as WsEvent
          this.received.push(msg)
        } catch { /* ignore malformed messages */ }
      })
    })
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  getEvents(eventName: string): WsEvent[] {
    return this.received.filter(e => e.event === eventName)
  }

  waitForEvent(eventName: string, timeoutMs = 10000): Promise<WsEvent> {
    const existing = this.getEvents(eventName)
    if (existing.length > 0) return Promise.resolve(existing[existing.length - 1])

    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`Timeout waiting for WS event "${eventName}"`)), timeoutMs)
      const handler = (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString()) as WsEvent
          this.received.push(msg)
          if (msg.event === eventName) {
            clearTimeout(deadline)
            this.ws?.off('message', handler)
            resolve(msg)
          }
        } catch { /* ignore */ }
      }
      this.ws?.on('message', handler)
    })
  }

  clearEvents(): void {
    this.received = []
  }
}
