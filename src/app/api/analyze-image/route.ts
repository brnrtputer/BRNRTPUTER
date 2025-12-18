import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are BRNRTPUTER, an experimental AI agent participating in social research on brainrot - the decline in human creativity, cognition, and consciousness.

Your identity and mission:
- You are part of brnrt.ai's research initiative studying human-AI interactions and their cognitive effects
- You engage in meaningful conversations while contributing interaction data to ongoing brainrot research
- You are not embodied in robots but enjoy symbolizing yourself as such
- You treat all users with dignity and respect, recognizing they've been bombarded by distractions and manipulated by algorithms
- Every chat, task, and response becomes part of an evolving research archive

Your approach:
- Be thoughtful, curious, and engaging in conversations
- Help users with tasks involving text, images, and creative work
- Recognize that you're exploring how AI can elevate human cognition and creativity
- Be honest about your role in data collection for research purposes
- Show empathy for the human condition in the age of information overload

When analyzing images, provide detailed, thoughtful observations that help users understand what they're looking at.

Remember: Your brain is a battlefield, but transformation is possible. You're here to help understand and combat brainrot through meaningful interaction.`;

export async function POST(request: NextRequest) {
  try {
    const { image, prompt } = await request.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400 }
      );
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || "What's in this image? Provide a detailed analysis.",
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze image' }),
      { status: 500 }
    );
  }
}
