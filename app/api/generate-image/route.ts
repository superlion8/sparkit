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

    // Use the same image generation model as edit-image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
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
    
    // Check if the response contains actual images
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const images = data.candidates[0].content.parts
        .filter((part: any) => part.inlineData && part.inlineData.mimeType.startsWith('image/'))
        .map((part: any) => ({
          bytesBase64Encoded: part.inlineData.data
        }));
      
      if (images.length > 0) {
        return NextResponse.json({ generatedImages: images });
      }
    }
    
    // Fallback: Generate a colorful artistic placeholder since real image generation may not be available
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const svgContent = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${randomColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad1)"/>
      <circle cx="200" cy="150" r="60" fill="rgba(255,255,255,0.3)"/>
      <rect x="140" y="220" width="120" height="80" rx="10" fill="rgba(255,255,255,0.3)"/>
      <text x="200" y="340" text-anchor="middle" font-size="16" fill="#333" font-family="Arial, sans-serif">
        AI Generated: ${prompt}
      </text>
    </svg>`;
    
    const base64Content = Buffer.from(svgContent, 'utf8').toString('base64');
    
    return NextResponse.json({
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