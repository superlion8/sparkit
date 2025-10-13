# Creator AI Toolkit

AI-powered image and video generation and editing toolkit built with Next.js and React.

## Features

- 🎨 Text-to-Image Generation (Gemini & Kontext Pro)
- ✏️ Image-to-Image Editing (Multi-image support)
- 👗 AI Outfit Change
- 🖼️ AI Background Replacement
- 🎥 Video Generation
- 🎬 Video Subject Replacement

## Getting Started

### Prerequisites

- Node.js 18+ installed
- API Keys for Gemini and BFL

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

3. Add your API keys to `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Tech Stack

- **Framework**: Next.js 14
- **UI**: React 18 + Tailwind CSS
- **Language**: TypeScript
- **Icons**: Lucide React
- **API**: Gemini API + BFL API

## License

MIT

