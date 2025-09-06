# Sparkit - AI Image Generation Tool (Midjourney Style UI)

A modern, AI-powered image generation and editing tool with a beautiful Midjourney-inspired interface built with Next.js and TypeScript.

## ✨ Features

### 🎨 **AI Image Generation**
- Text-to-image generation using Google Gemini API
- Multiple art styles (Realistic, Anime, Cyberpunk, Fantasy, etc.)
- Batch generation (up to 3 images at once)
- High-resolution output options

### 🖼️ **Image Editing**
- Upload and edit existing images
- AI-powered enhancement tools
- Background removal and replacement
- Style transfer and colorization
- Image upscaling and restoration

### 🏠 **Modern Dashboard**
- Clean, Midjourney-inspired interface
- Real-time activity feed
- Usage statistics and analytics
- Quick action shortcuts

### 📱 **Responsive Design**
- Mobile-first approach
- Collapsible sidebar navigation
- Touch-friendly interactions
- Optimized for all screen sizes

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add your Gemini API key
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Key Components

### Sidebar Navigation
- **Home**: Dashboard with stats and quick actions
- **Generate**: AI image generation interface
- **Edit**: Image editing tools
- **Batch**: Process multiple images
- **Gallery**: View all created images
- **Favorites**: Saved images
- **History**: Recent activity
- **Styles**: Art style presets

### UI Features
- **Collapsible Sidebar**: Space-efficient navigation
- **Gradient Design**: Modern purple-to-pink gradients
- **Interactive Elements**: Hover effects and animations
- **Dark Theme**: Professional dark sidebar
- **Light Content**: Clean white content areas

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Icons**: Lucide React
- **API**: Google Gemini 2.5 Flash
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
sparkit-redesign/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Main layout component
│   └── page.tsx             # Home page
├── components/
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── Header.tsx           # Top header
│   ├── Dashboard.tsx        # Dashboard page
│   ├── GeneratePage.tsx     # Image generation
│   ├── EditPage.tsx         # Image editing
│   └── GalleryPage.tsx      # Image gallery
├── package.json
├── tailwind.config.ts       # Tailwind configuration
└── README.md
```

## 🎨 Design System

### Colors
- **Primary**: Purple gradient (#9333ea to #ec4899)
- **Secondary**: Pink accent (#ec4899)
- **Neutral**: Gray scale for text and backgrounds
- **Success**: Green for positive actions
- **Warning**: Yellow for attention
- **Error**: Red for errors

### Typography
- **Font**: Inter (system font fallback)
- **Headings**: Bold, gradient text
- **Body**: Clean, readable text
- **Labels**: Medium weight, muted colors

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Gradient backgrounds, hover effects
- **Inputs**: Focus rings, smooth transitions
- **Navigation**: Active states, smooth animations

## 🔧 Customization

### Adding New Pages
1. Create component in `components/`
2. Add route to `app/layout.tsx`
3. Update sidebar navigation in `Sidebar.tsx`

### Styling
- Modify `tailwind.config.ts` for theme changes
- Update `app/globals.css` for custom styles
- Use Tailwind utility classes for quick styling

### API Integration
- Update API endpoints in respective components
- Add error handling and loading states
- Implement proper TypeScript types

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Other Platforms
- Netlify
- Railway
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by Midjourney's clean, modern interface
- Built with Next.js and Tailwind CSS
- Icons by Lucide React
- AI powered by Google Gemini

---

**Made with ❤️ and AI**
