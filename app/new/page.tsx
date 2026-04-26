'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const loadingMessages = [
  'Finding the perfect words for you...',
  'Writing your story...',
  'Capturing how awesome you were...',
  'Recording your highlight reel...',
  'Almost ready...',
]

type RecordingState = 'idle' | 'recording' | 'transcribing'

export default function NewMomentPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecordingState('transcribing')

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'recording.webm')

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Transcription failed')
          setText((prev) => prev ? prev + ' ' + data.text : data.text)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not transcribe. Please try again.')
        } finally {
          setRecordingState('idle')
        }
      }

      mediaRecorder.start()
      setRecordingState('recording')
    } catch {
      setError('Microphone access denied. Please allow microphone in your browser settings.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const handleMicClick = () => {
    if (recordingState === 'recording') {
      stopRecording()
    } else if (recordingState === 'idle') {
      startRecording()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')

    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 3500)

    try {
      const formData = new FormData()
      formData.append('momentText', text.trim())
      if (image) formData.append('image', image)

      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push(`/story/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    } finally {
      clearInterval(interval)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">✨</div>
          <p className="text-stone-700 font-semibold text-lg mb-2">Creating your story...</p>
          <p className="text-stone-400 text-sm transition-all duration-500">
            {loadingMessages[msgIndex]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-rose-50 px-4 py-8 max-w-xl mx-auto">
      <div className="flex items-center mb-8">
        <Link href="/" className="text-stone-400 hover:text-stone-600 mr-4 text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-stone-800">Add a Moment</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-stone-700">
              What happened today? ✍️
            </label>
            <button
              type="button"
              onClick={handleMicClick}
              disabled={recordingState === 'transcribing'}
              title={recordingState === 'recording' ? 'Tap to stop' : 'Tap to speak'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                recordingState === 'recording'
                  ? 'bg-red-100 text-red-500 animate-pulse'
                  : recordingState === 'transcribing'
                  ? 'bg-rose-50 text-rose-300 cursor-not-allowed'
                  : 'bg-white border border-rose-200 text-rose-400 hover:border-rose-300 hover:text-rose-500'
              }`}
            >
              {recordingState === 'recording' ? (
                <><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Stop</>
              ) : recordingState === 'transcribing' ? (
                <>✨ Transcribing...</>
              ) : (
                <>🎙 Speak</>
              )}
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              recordingState === 'recording'
                ? 'Listening... tap Stop when done.'
                : 'Tell me about a moment from your day. Even small wins count — a tough decision you made, something you handled well, a great conversation...'
            }
            className="w-full bg-white border border-rose-100 rounded-2xl p-4 text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 min-h-40 resize-none shadow-sm text-sm leading-relaxed"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Add a photo (optional) 📸
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-52 object-cover rounded-2xl"
              />
              <button
                type="button"
                onClick={() => { setImage(null); setImagePreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-rose-200 rounded-2xl py-10 text-stone-400 hover:border-rose-300 hover:text-stone-500 transition-colors text-sm"
            >
              Tap to add a photo
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!text.trim()}
          className="w-full bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors shadow-md"
        >
          Create My Story ✨
        </button>
      </form>
    </main>
  )
}
