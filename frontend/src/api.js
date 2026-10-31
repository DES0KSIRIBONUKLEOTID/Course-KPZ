// Клієнт для REST API (Laravel). Усі запити йдуть на /api з токеном авторизації.

const TOKEN_KEY = 'token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

let onUnauthorized = () => {}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Laravel повертає або { errors: { поле: [повідомлення] } } (422), або { message }
function errorMessage(status, data) {
  if (data.errors) return Object.values(data.errors)[0][0]
  if (status === 403) return 'Недостатньо прав для цієї дії'
  if (status >= 500) return 'Помилка сервера. Спробуйте пізніше'
  return data.message || 'Помилка запиту'
}

async function request(method, path, { params, body } = {}) {
  const url = new URL('/api' + path, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== '' && value != null) url.searchParams.set(key, value)
  }

  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`

  let response
  try {
    response = await fetch(url, { method, headers, body: body && JSON.stringify(body) })
  } catch {
    throw new ApiError('Немає зв’язку із сервером', 0)
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401 && path !== '/login') onUnauthorized()
    throw new ApiError(errorMessage(response.status, data), response.status)
  }
  return data
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body: body ?? {} }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
}
