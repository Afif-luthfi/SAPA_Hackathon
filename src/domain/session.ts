export type Role = 'patient' | 'staff'

export type AssistanceKind = 'staff' | 'interpreter'

export type Message = {
  id: string
  role: Role
  text: string
}

export type SessionState = {
  isActive: boolean
  messages: Message[]
  assistance: AssistanceKind | null
}

export type SessionEvent =
  | { type: 'START_SESSION' }
  | { type: 'END_SESSION' }
  | { type: 'SEND_MESSAGE'; message: Message }
  | { type: 'REQUEST_ASSISTANCE'; kind: AssistanceKind }
  | { type: 'RESOLVE_ASSISTANCE' }

function createSession(isActive = false): SessionState {
  return { isActive, messages: [], assistance: null }
}

export const initialSession: SessionState = createSession()

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  if (event.type === 'START_SESSION') {
    return state.isActive ? state : createSession(true)
  }

  if (event.type === 'END_SESSION') {
    return createSession()
  }

  if (!state.isActive) return state

  switch (event.type) {
    case 'SEND_MESSAGE': {
      const text = event.message.text.trim()
      if (
        text.length === 0 ||
        text.length > 1000 ||
        state.messages.some((message) => message.id === event.message.id)
      ) {
        return state
      }

      return {
        ...state,
        messages: [...state.messages, { ...event.message, text }],
      }
    }
    case 'REQUEST_ASSISTANCE':
      return { ...state, assistance: event.kind }
    case 'RESOLVE_ASSISTANCE':
      return { ...state, assistance: null }
  }
}
