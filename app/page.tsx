import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Story } from '@/lib/types'
import StoryCard from '@/components/StoryCard'

export const dynamic = 'force-dynamic'

async function getStories(): Promise<Story[]> {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export default async function HomePage() {
  const stories = await getStories()

  return (
    <main className="min-h-screen bg-rose-50 px-4 py-10 max-w-xl mx-auto">
      <div className="text-center mb-10">
        <div className="text-4xl mb-3">✨</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Prerana's Story Diary</h1>
        <p className="text-stone-400 text-sm">Your moments, beautifully told</p>
      </div>

      <Link
        href="/new"
        className="flex items-center justify-center gap-2 w-full bg-rose-400 hover:bg-rose-500 text-white font-semibold py-4 rounded-2xl mb-8 transition-colors shadow-md text-base"
      >
        + Add a Moment
      </Link>

      {stories.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-5xl mb-4">📖</p>
          <p className="font-medium text-stone-500">Your diary is waiting.</p>
          <p className="text-sm mt-1">Add your first moment above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </main>
  )
}
