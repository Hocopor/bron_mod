'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'

interface Props {
  title: string
  hint?: string
  multiple?: boolean
  disabled?: boolean
  accept?: string
  onFilesSelected: (files: File[]) => void | Promise<void>
}

export function AdminFileDropzone({
  title,
  hint,
  multiple = false,
  disabled = false,
  accept = 'image/*',
  onFilesSelected,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return
    await onFilesSelected(Array.from(files))
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault()
        setIsDragging(false)
        await handleFiles(event.dataTransfer.files)
      }}
      className={[
        'rounded-2xl border-2 border-dashed p-5 text-center transition-all',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        isDragging ? 'border-sea-600 bg-sea-50' : 'border-gray-200 bg-gray-50 hover:border-sea-400 hover:bg-sea-50/60',
      ].join(' ')}
      onClick={() => {
        if (!disabled) inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <ImagePlus className="h-6 w-6 text-sea-700" />
      </div>
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="mt-1 text-xs text-gray-500">
        {hint || 'Перетащите файлы сюда или нажмите, чтобы выбрать'}
      </div>
    </div>
  )
}
