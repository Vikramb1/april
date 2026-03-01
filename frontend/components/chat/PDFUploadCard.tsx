'use client'

import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { api } from '@/lib/api'

interface PDFUploadCardProps {
  reason: string
}

export function PDFUploadCard({ reason }: PDFUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { sessionId, addMessage, setPendingPdfUpload, setTaxData, taxData } = useStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      addMessage: s.addMessage,
      setPendingPdfUpload: s.setPendingPdfUpload,
      setTaxData: s.setTaxData,
      taxData: s.taxData,
    }))
  )

  async function handleFile(file: File) {
    if (!sessionId || !file.name.endsWith('.pdf')) return
    setUploading(true)
    try {
      const result = await api.uploadPdf(sessionId, file)
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `Got it — I've extracted your ${result.form_type}. The fields are now saved to your return.`,
      })
      if (result.form_type === 'W-2' && result.extracted_fields) {
        setTaxData({
          ...taxData,
          w2_forms: [...(taxData?.w2_forms ?? []), result.extracted_fields as Record<string, unknown>],
        } as Parameters<typeof setTaxData>[0])
      }
      setPendingPdfUpload(false)
      setCollapsed(true)
    } catch {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'There was a problem reading that PDF. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className="transition-all duration-300 overflow-hidden"
      style={{ maxHeight: collapsed ? 0 : 300 }}
    >
      <div className="border border-green rounded-xl p-4 bg-white">
        <p className="text-[14px] font-semibold text-ink mb-3">{reason}</p>
        <div
          className="border-2 border-dashed border-hairline rounded-lg p-6 text-center hover:border-green transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <p className="text-[12px] text-muted">Uploading...</p>
          ) : (
            <p className="text-[12px] text-muted">Drag &amp; drop or click to upload · PDF only</p>
          )}
        </div>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
