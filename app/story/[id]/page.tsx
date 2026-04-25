import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Story } from '@/lib/types'
import AudioPlayer from '@/components/AudioPlayer'

async function getStory(id: string): Promise<Story | null> {
  const { data } = await supabase.from('stories').select('*').eq('id', id).single()
  return data
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const story = await getStory(id)
  if (!story) notFound()

  return (
    <main className="min-h-screen bg-rose-50 px-4 py-8 max-w-xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/" className="text-stone-400 hover:text-stone-600 text-sm">
          ← All Stories
        </Link>
      </div>

      <article className="bg-white rounded-2xl shadow-sm p-6 border border-rose-100">
        <p className="text-xs text-stone-400 mb-2">{formatDate(story.created_at)}</p>
        <h1 className="text-2xl font-bold text-stone-800 mb-5 leading-snug">{story.title}</h1>

        {story.image_url && (
          <img
            src={story.image_url}
            alt="Moment"
            className="w-full h-52 object-cover rounded-xl mb-5"
          />
        )}

        <div className="space-y-4">
          {story.story_text.split('\n\n').map((para, i) => (
            <p key={i} className="text-stone-700 leading-relaxed text-[15px]">
              {para}
            </p>
          ))}
        </div>

        {story.audio_url && <AudioPlayer audioUrl={story.audio_url} />}
      </article>

      <div className="mt-6 text-center">
        <Link
          href="/new"
          className="inline-flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white font-semibold px-6 py-3 rounded-2xl transition-colors shadow-md"
        >
          + Add Another Moment
        </Link>
      </div>
    </main>
  )
}
