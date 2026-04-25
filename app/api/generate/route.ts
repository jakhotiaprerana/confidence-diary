import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const momentText = formData.get('momentText') as string
    const imageFile = formData.get('image') as File | null

    if (!momentText) {
      return NextResponse.json({ error: 'Moment text is required' }, { status: 400 })
    }

    // Upload image if provided
    let imageUrl: string | null = null
    if (imageFile && imageFile.size > 0) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      const ext = imageFile.type.split('/')[1] || 'jpg'
      const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('media')
        .upload(path, imageBuffer, { contentType: imageFile.type })
      if (!error) {
        imageUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
      }
    }

    // Build message content
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Here's a moment from my day: ${momentText}${imageUrl ? '\n\nI have also shared an image connected to this moment. Look closely at it — any visible feedback, messages, reactions, expressions, results, or context in the image. Weave what you observe from the image directly into the story as concrete evidence of what happened.' : ''}\n\nWrite a grounded, insightful story about this moment starring Prerana. Make it 200-250 words, third person. Also give it a short title (5-7 words max).\n\nRespond ONLY with valid JSON:\n{"title": "...", "story": "..."}`,
      },
    ]
    if (imageUrl) {
      userContent.push({ type: 'image_url', image_url: { url: imageUrl } })
    }

    // Generate story
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a warm, grounded narrator — part therapist, part motivational speaker — who helps Prerana see her own strengths clearly and honestly. You write in third person about real moments from her day.

Your style:
- Speak with calm authority, like someone who truly understands human behavior
- Point out what her actions reveal about her character — not in a cheerleader way, but in a "let's be honest about what just happened" way
- Use specific, real language. No superlatives, no "amazing" or "incredible". Say things like "That took courage", "Most people would have avoided that conversation", "She made a choice most people don't make"
- Acknowledge that it wasn't easy — then explain why she did it anyway
- Help her see the pattern: this moment connects to who she actually is, not just what she did today
- End with one honest, grounding insight — something she can carry with her

Tone: think Brené Brown meets a wise friend who doesn't let you sell yourself short.`,
        },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')
    const { title, story } = parsed

    if (!title || !story) throw new Error('Failed to parse story from AI response')

    // Generate audio
    let audioUrl: string | null = null
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: story,
      })
      const audioBuffer = Buffer.from(await mp3.arrayBuffer())
      const audioPath = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
      const { error: audioError } = await supabase.storage
        .from('media')
        .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' })
      if (!audioError) {
        audioUrl = supabase.storage.from('media').getPublicUrl(audioPath).data.publicUrl
      } else {
        console.error('Audio upload error:', audioError)
      }
    } catch (audioErr) {
      console.error('Audio generation failed:', audioErr)
    }

    // Save to database
    const { data: saved, error: dbError } = await supabase
      .from('stories')
      .insert({ moment_text: momentText, image_url: imageUrl, story_text: story, audio_url: audioUrl, title })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ id: saved.id })
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 })
  }
}
