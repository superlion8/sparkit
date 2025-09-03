import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, count = 1 } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Try the text generation API first to test the key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a detailed text description for generating this image: ${prompt}`
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      return NextResponse.json(
        { error: `Failed to generate image: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // For now, just return a placeholder to test API connectivity
    const svgContent = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#f0f0f0"/>
      <text x="200" y="200" text-anchor="middle" font-size="20" fill="#666">
        Placeholder: ${prompt}
      </text>
    </svg>`;
    
    // Use Buffer.from instead of btoa for server-side
    const base64Content = Buffer.from(svgContent, 'utf8').toString('base64');
    
    return NextResponse.json({
      message: 'API connected successfully',
      textResponse: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text response',
      generatedImages: [{
        bytesBase64Encoded: base64Content
      }]
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}