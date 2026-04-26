import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function extractStoragePath(url: string): string | null {
  // Supabase public URL: .../storage/v1/object/public/media/{path}
  const match = url.match(/\/object\/public\/media\/(.+)/)
  return match ? match[1] : null
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: story, error: fetchError } = await supabase
    .from('stories')
    .select('image_url, audio_url')
    .eq('id', id)
    .single()

  if (fetchError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 })
  }

  // Delete storage files
  const pathsToDelete: string[] = []
  if (story.image_url) {
    const p = extractStoragePath(story.image_url)
    if (p) pathsToDelete.push(p)
  }
  if (story.audio_url) {
    const p = extractStoragePath(story.audio_url)
    if (p) pathsToDelete.push(p)
  }
  if (pathsToDelete.length > 0) {
    await supabase.storage.from('media').remove(pathsToDelete)
  }

  const { error: deleteError } = await supabase.from('stories').delete().eq('id', id)
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
