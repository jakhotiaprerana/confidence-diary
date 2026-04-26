import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function compressForVision(buffer: Buffer, mimeType: string): Promise<string> {
  // Resize to max 1024px and convert to JPEG for a compact base64 payload
  const compressed = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
  return `data:image/jpeg;base64,${compressed.toString('base64')}`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const momentText = formData.get('momentText') as string
    const imageFile = formData.get('image') as File | null

    if (!momentText) {
      return NextResponse.json({ error: 'Moment text is required' }, { status: 400 })
    }

    // Process image
    let imageBase64: string | null = null
    let imageUrl: string | null = null

    if (imageFile && imageFile.size > 0) {
      try {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

        // Compress for GPT-4o vision (small payload, fast)
        imageBase64 = await compressForVision(imageBuffer, imageFile.type)

        // Upload original to Supabase for display
        await supabase.storage.createBucket('media', { public: true }).catch(() => {})
        const ext = imageFile.type.split('/')[1] || 'jpg'
        const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage
          .from('media')
          .upload(path, imageBuffer, { contentType: imageFile.type })
        if (!error) {
          imageUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
        } else {
          console.error('Image upload error:', error)
        }
      } catch (imgErr) {
        console.error('Image processing error:', imgErr)
        // Continue without image rather than failing the whole request
      }
    }

    // Build message for GPT-4o
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Here's a moment from Prerana's day: ${momentText}${imageBase64 ? '\n\nShe also shared a photo from this moment. Look at it closely — describe what you see and weave it naturally into the story, like you\'re looking at it together.' : ''}\n\nWrite a warm, personal story about this moment in third person (200–250 words). Also give it a short title (5–7 words).\n\nRespond ONLY with valid JSON:\n{"title": "...", "story": "..."}`,
      },
    ]
    if (imageBase64) {
      userContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
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

    const rawContent = completion.choices[0].message.content || ''
    console.log('GPT-4o raw response:', rawContent.slice(0, 300))

    let parsed: Record<string, string> = {}
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      throw new Error(`Invalid JSON from AI: ${rawContent.slice(0, 200)}`)
    }

    // Handle key name variations GPT-4o sometimes returns
    const title = parsed.title || parsed.Title || parsed.TITLE || ''
    const story = parsed.story || parsed.Story || parsed.STORY || parsed.content || parsed.text || ''

    if (!title || !story) {
      throw new Error(`AI returned unexpected fields: ${Object.keys(parsed).join(', ')}`)
    }

    // Generate audio — shimmer voice, HD quality
    let audioUrl: string | null = null
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'shimmer',
        input: story,
      })
      const audioBuffer = Buffer.from(await mp3.arrayBuffer())
      await supabase.storage.createBucket('media', { public: true }).catch(() => {})
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

    if (dbError) throw new Error(`Database error: ${dbError.message}`)

    return NextResponse.json({ id: saved.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Generate error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
