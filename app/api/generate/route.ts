import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

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
        text: `Here's a moment from my day: ${momentText}\n\nWrite a beautiful, warm story about this moment starring me as Prerana. Make it 200-250 words, third person, warm and uplifting — like a best friend narrating my highlight reel. Highlight what made me awesome, strong, or thoughtful in this moment. Also give it a short, memorable title (5-7 words max).\n\nRespond ONLY with valid JSON:\n{"title": "...", "story": "..."}`,
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
          content: `You are a warm, uplifting narrator who transforms everyday moments into beautiful, confidence-boosting stories about Prerana. You write like her most supportive best friend — someone who sees her strength, wisdom, and awesomeness even in small moments. Your tone is genuine and heartfelt, never cheesy or over-the-top. You celebrate her exactly as she is. Every story ends with a sentence that reminds her just how capable and wonderful she truly is.`,
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
      }
    } catch (audioErr) {
      console.error('Audio generation failed (non-fatal):', audioErr)
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
