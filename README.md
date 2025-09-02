# Sparkit 🍌

An AI-powered image generation and editing tool built with Next.js and Google Gemini API.

## Features

- **Text-to-Image Generation**: Create stunning images from text prompts
- **Image Editing**: Upload and edit existing images with AI
- **Multiple Images**: Generate up to 3 images at once
- **Responsive Design**: Works on desktop and mobile
- **Download Support**: Save generated/edited images

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **API**: Google Gemini 2.5 Flash
- **Deployment**: Vercel
- **UI Components**: Lucide React icons

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/superlion8/sparkit.git
   cd sparkit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add `GEMINI_API_KEY` environment variable in Vercel dashboard
3. Deploy automatically

### Other Platforms

The app can be deployed on any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify

## API Endpoints

- `POST /api/generate-image` - Generate images from text prompts
- `POST /api/edit-image` - Edit existing images with prompts

## Getting Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your environment variables

## License

MIT License

## Contributing

Pull requests are welcome! For major changes, please open an issue first.
