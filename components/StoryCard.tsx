import Link from 'next/link'
import { Story } from '@/lib/types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function StoryCard({ story }: { story: Story }) {
  const preview = story.story_text.slice(0, 130) + '...'

  return (
    <Link href={`/story/${story.id}`}>
      <div className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow border border-rose-100 active:scale-[0.99]">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-semibold text-stone-800 text-base leading-snug flex-1 mr-3">
            {story.title}
          </h2>
          {story.audio_url && <span className="text-rose-300 text-sm flex-shrink-0">🎧</span>}
        </div>
        <p className="text-stone-500 text-sm mb-3 leading-relaxed">{preview}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">{formatDate(story.created_at)}</span>
          {story.image_url && (
            <img
              src={story.image_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
          )}
        </div>
      </div>
    </Link>
  )
}
