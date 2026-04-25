'use client'

import { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setProgress((audio.currentTime / audio.duration) * 100)
    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause() } else { audio.play() }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-rose-50 rounded-2xl p-4 mt-6 border border-rose-100">
      <p className="text-xs text-stone-500 mb-3 text-center font-medium tracking-wide uppercase">
        🎧 Listen to your story
      </p>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-11 h-11 bg-rose-400 hover:bg-rose-500 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors text-lg shadow-sm"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="flex-1">
          <div
            className="h-2 bg-rose-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-2 bg-rose-400 rounded-full transition-all pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-stone-400 flex-shrink-0 w-10 text-right">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
