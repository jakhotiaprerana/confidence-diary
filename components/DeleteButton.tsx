'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ storyId }: { storyId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/stories/${storyId}`, { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="text-sm text-stone-400">Delete this story?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-stone-400 hover:text-stone-600 px-3 py-1"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-white bg-red-400 hover:bg-red-500 disabled:bg-red-200 px-3 py-1 rounded-lg transition-colors"
        >
          {deleting ? 'Deleting...' : 'Yes, delete'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-stone-300 hover:text-red-400 transition-colors py-1"
      >
        Delete story
      </button>
    </div>
  )
}
