import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { prompt, walletAddress } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    if (!response.data || response.data.length === 0) {
      return new Response(JSON.stringify({ error: 'No image generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tempImageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;

    // Download image from OpenAI and upload to Supabase Storage
    // This must be done server-side to avoid CORS issues
    let permanentImageUrl = tempImageUrl;
    
    if (walletAddress && tempImageUrl) {
      try {
        console.log('Downloading image from OpenAI...');
        // Download the image from OpenAI
        const imageResponse = await fetch(tempImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        console.log('Image downloaded, size:', imageBuffer.byteLength, 'bytes');
        
        // Generate unique filename
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const filepath = `${walletAddress}/${filename}`;
        console.log('Uploading to Supabase Storage:', filepath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filepath, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw uploadError;
        }

        if (uploadData) {
          console.log('Upload successful:', uploadData);
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('chat-images')
            .getPublicUrl(filepath);
          
          permanentImageUrl = urlData.publicUrl;
          console.log('Permanent URL:', permanentImageUrl);
        }
      } catch (uploadError) {
        console.error('Failed to upload image to storage:', uploadError);
        console.log('Falling back to temporary OpenAI URL');
        // Continue with OpenAI URL as fallback
      }
    } else {
      console.log('No wallet address provided, using temporary URL');
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: permanentImageUrl,
        revisedPrompt,
        originalPrompt: prompt 
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
