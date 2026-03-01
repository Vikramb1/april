const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
  return res.json()
}

async function postForm<T>(path: string, data: Record<string, string | File | number>): Promise<T> {
  const form = new FormData()
  for (const [k, v] of Object.entries(data)) {
    form.append(k, v instanceof File ? v : String(v))
  }
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

export const api = {
  createUser: (email: string) =>
    post<{ user_id: number; email: string }>('/users', { email }),

  createSession: (userId: number) =>
    post<{ session_id: number; user_id: number; status: string }>('/sessions', { user_id: userId }),

  chat: (sessionId: number, message: string, activeSection?: string) =>
    post<{
      reply: string
      request_pdf_upload: boolean
      pdf_upload_reason: string | null
      session_status: string
      navigate_to_section: string | null
      snapshot: {
        tax_return: Record<string, unknown> | null
        w2_forms: Record<string, unknown>[]
        form_1099s: Record<string, unknown>[]
        deductions: Record<string, unknown> | null
        credits: Record<string, unknown> | null
        other_income: Record<string, unknown> | null
        dependents: Record<string, unknown>[]
        misc_info: Record<string, unknown> | null
        state_info: Record<string, unknown> | null
      } | null
    }>('/chat', { session_id: sessionId, message, active_section: activeSection }),

  uploadPdf: (sessionId: number, file: File) =>
    postForm<{ form_type: string; extracted_fields: Record<string, unknown>; saved: boolean }>(
      '/upload-pdf',
      { session_id: sessionId, file }
    ),

  sessionStatus: (sessionId: number) =>
    get<{ status: string; missing_fields: string[]; percent_complete: number }>(
      `/sessions/${sessionId}/status`
    ),

  submitTaxes: (userId: number) =>
    post<{ results: { section_name: string; success: boolean; error?: string }[]; overall_success: boolean }>(
      '/submit-taxes',
      { user_id: userId }
    ),

  retrySection: (userId: number, sectionName: string) =>
    post<{ section_name: string; success: boolean; error?: string }>(
      '/retry-section',
      { user_id: userId, section_name: sectionName }
    ),

  userData: (userId: number) =>
    get<{
      user_id: number
      email: string
      tax_return: Record<string, unknown> | null
      w2_forms: Record<string, unknown>[]
      form_1099s: Record<string, unknown>[]
      deductions: Record<string, unknown> | null
      credits: Record<string, unknown> | null
      other_income: Record<string, unknown> | null
      dependents: Record<string, unknown>[]
      misc_info: Record<string, unknown> | null
      state_info: Record<string, unknown> | null
    }>(`/users/${userId}/data`),

  updateData: (userId: number, data: {
    tax_return?: Record<string, unknown> | null
    w2_forms?: Record<string, unknown>[]
    form_1099s?: Record<string, unknown>[]
    deductions?: Record<string, unknown> | null
    credits?: Record<string, unknown> | null
    other_income?: Record<string, unknown> | null
    dependents?: Record<string, unknown>[]
    misc_info?: Record<string, unknown> | null
    state_info?: Record<string, unknown> | null
  }) =>
    put<{ user_id: number }>(`/users/${userId}/data`, data),

  resetData: (userId: number) =>
    del<{ success: boolean }>(`/users/${userId}/data`),

  uploadW2Pdf: (userId: number, file: File) =>
    postForm<{ form_type: string; extracted_fields: Record<string, unknown> }>(
      '/upload-w2-pdf',
      { user_id: userId, file }
    ),

  upload1099Pdf: (userId: number, file: File) =>
    postForm<{ form_type: string; extracted_fields: Record<string, unknown> }>(
      '/upload-1099-pdf',
      { user_id: userId, file }
    ),

  fetchGustoW2: (userId: number) =>
    post<{ form_type: string; extracted_fields: Record<string, unknown>; saved: boolean; w2_id: number }>(
      '/fetch-gusto-w2',
      { user_id: userId }
    ),

  fetchFidelity1099: (userId: number) =>
    post<{ form_type: string; extracted_fields: Record<string, unknown>; saved: boolean; form_1099_id: number }>(
      '/fetch-fidelity-1099',
      { user_id: userId }
    ),
}

export { BASE }
