import { describe, expect, it } from 'vitest'
import {
  initialSession,
  sessionReducer,
  type SessionEvent,
} from './session'

const startSession = () =>
  sessionReducer(initialSession, { type: 'START_SESSION' })

describe('sessionReducer', () => {
  it('starts an empty, active session without changing the initial state', () => {
    const state = startSession()

    expect(state).toEqual({
      isActive: true,
      messages: [],
      assistance: null,
    })
    expect(initialSession).toEqual({
      isActive: false,
      messages: [],
      assistance: null,
    })
    expect(state.messages).not.toBe(initialSession.messages)
  })

  it.each<SessionEvent>([
    {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'patient', text: 'Saya ingin mendaftar.' },
    },
    { type: 'REQUEST_ASSISTANCE', kind: 'staff' },
    { type: 'REQUEST_ASSISTANCE', kind: 'interpreter' },
    { type: 'RESOLVE_ASSISTANCE' },
  ])('ignores $type while the session is inactive', (event) => {
    expect(sessionReducer(initialSession, event)).toBe(initialSession)
  })

  it('keeps both sides of a conversation in order and trims text', () => {
    const patientMessage = {
      id: '1',
      role: 'patient' as const,
      text: '  Di mana loket pendaftaran? \n',
    }
    const started = startSession()
    const first = sessionReducer(started, {
      type: 'SEND_MESSAGE',
      message: patientMessage,
    })
    const state = sessionReducer(first, {
      type: 'SEND_MESSAGE',
      message: { id: '2', role: 'staff', text: 'Loket ada di sebelah kanan.' },
    })

    expect(state.messages).toEqual([
      { id: '1', role: 'patient', text: 'Di mana loket pendaftaran?' },
      { id: '2', role: 'staff', text: 'Loket ada di sebelah kanan.' },
    ])
    expect(started.messages).toEqual([])
    expect(first.messages).toHaveLength(1)
    expect(patientMessage.text).toBe('  Di mana loket pendaftaran? \n')
  })

  it.each(['', ' \n\t ', 'a'.repeat(1001)])(
    'ignores empty, whitespace-only, or oversized messages',
    (text) => {
      const state = startSession()
      expect(
        sessionReducer(state, {
          type: 'SEND_MESSAGE',
          message: { id: '1', role: 'patient', text },
        }),
      ).toBe(state)
    },
  )

  it('accepts a message at the 1000-character limit after trimming', () => {
    const state = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'patient', text: ` ${'a'.repeat(1000)} ` },
    })

    expect(state.messages).toHaveLength(1)
    expect(state.messages[0].text).toHaveLength(1000)
  })

  it('ignores an already accepted message ID even if its text or role changes', () => {
    const state = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: 'same-id', role: 'patient', text: 'Terima kasih.' },
    })

    expect(
      sessionReducer(state, {
        type: 'SEND_MESSAGE',
        message: { id: 'same-id', role: 'staff', text: 'Sama-sama.' },
      }),
    ).toBe(state)
    expect(state.messages).toHaveLength(1)
  })

  it('allows repeated text when the user intentionally sends a new message', () => {
    const first = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'patient', text: 'Tolong ulangi.' },
    })
    const state = sessionReducer(first, {
      type: 'SEND_MESSAGE',
      message: { id: '2', role: 'patient', text: 'Tolong ulangi.' },
    })

    expect(state.messages).toHaveLength(2)
  })

  it('can change and resolve an assistance request without losing the conversation', () => {
    const conversation = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'patient', text: 'Saya perlu bantuan.' },
    })
    const staffRequested = sessionReducer(conversation, {
      type: 'REQUEST_ASSISTANCE',
      kind: 'staff',
    })
    expect(staffRequested.assistance).toBe('staff')

    const interpreterRequested = sessionReducer(staffRequested, {
      type: 'REQUEST_ASSISTANCE',
      kind: 'interpreter',
    })
    expect(interpreterRequested.assistance).toBe('interpreter')

    const resolved = sessionReducer(interpreterRequested, {
      type: 'RESOLVE_ASSISTANCE',
    })
    expect(resolved.assistance).toBeNull()
    expect(resolved.messages).toEqual(conversation.messages)
    expect(resolved.isActive).toBe(true)
  })

  it('retains the ongoing conversation and assistance when started again', () => {
    const conversation = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'staff', text: 'Silakan ambil nomor antrean.' },
    })
    const state = sessionReducer(conversation, {
      type: 'REQUEST_ASSISTANCE',
      kind: 'interpreter',
    })

    expect(sessionReducer(state, { type: 'START_SESSION' })).toBe(state)
  })

  it('clears the transcript and assistance on exit and starts fresh for the next patient', () => {
    const conversation = sessionReducer(startSession(), {
      type: 'SEND_MESSAGE',
      message: { id: '1', role: 'patient', text: 'Saya ingin mendaftar.' },
    })
    const requestingHelp = sessionReducer(conversation, {
      type: 'REQUEST_ASSISTANCE',
      kind: 'interpreter',
    })
    const ended = sessionReducer(requestingHelp, { type: 'END_SESSION' })

    expect(ended).toEqual({
      isActive: false,
      messages: [],
      assistance: null,
    })
    expect(sessionReducer(ended, { type: 'START_SESSION' })).toEqual({
      isActive: true,
      messages: [],
      assistance: null,
    })
  })
})
