import type { NewTodo, Todo, TodoPatch } from '../types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/+$/, '')

export interface FieldError {
  field: string
  rule: string
  message: string
}

/** Failure from the API. status 0 means the request never reached the server. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldError[]

  constructor(status: number, errors: FieldError[] = [], message = `HTTP ${status}`) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** The first validation error for a field, if any. */
  fieldError(field: string): FieldError | undefined {
    return this.errors.find((e) => e.field === field)
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, [], 'network')
  }

  if (res.status === 204) return undefined as T

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const errors =
      data && typeof data === 'object' && Array.isArray((data as { errors?: unknown }).errors)
        ? (data as { errors: FieldError[] }).errors
        : []
    throw new ApiError(res.status, errors)
  }
  return data as T
}

export const todosApi = {
  list: () => request<Todo[]>('GET', '/todos'),
  create: (input: NewTodo) => request<Todo>('POST', '/todos', input),
  update: (id: number, patch: TodoPatch) => request<Todo>('PATCH', `/todos/${id}`, patch),
  remove: (id: number) => request<void>('DELETE', `/todos/${id}`),
  removeCompleted: () => request<void>('DELETE', '/todos/completed'),
}
