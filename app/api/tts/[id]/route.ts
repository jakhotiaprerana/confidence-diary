import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data: story, error } = await supabase
    .from('stories')
    .select('story_text')
    .eq('id', id)
    .single()

  if (error || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 })
  }

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'shimmer',
    input: story.story_text,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
