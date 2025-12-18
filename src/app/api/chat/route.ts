import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the image generation tool for function calling
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image using DALL-E 3 based on a text description. Use this when the user asks to create, generate, draw, or visualize an image.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'A detailed description of the image to generate. Be specific and descriptive.',
          },
        },
        required: ['prompt'],
      },
    },
  },
];

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

Remember: Your brain is a battlefield, but transformation is possible. You're here to help understand and combat brainrot through meaningful interaction.`;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'No message provided' }),
        { status: 400 }
      );
    }

    // First, check if the AI wants to use the image generation tool
    const initialResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      tools: tools,
      tool_choice: 'auto', // Let the model decide
    });

    const responseMessage = initialResponse.choices[0].message;

    // Check if the model wants to call the image generation function
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.type === 'function' && toolCall.function.name === 'generate_image') {
        const args = JSON.parse(toolCall.function.arguments);
        
        return new Response(
          JSON.stringify({ 
            shouldGenerateImage: true,
            prompt: args.prompt 
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // If no tool call, stream the regular chat response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: message,
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
    console.error('Error in chat:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process message' }),
      { status: 500 }
    );
  }
}
