# Wedding Web Page

A beautiful, responsive wedding invitation website built with Next.js, React, and Supabase.

## Features

- 📱 Mobile-responsive design
- 🎨 Modern, elegant UI with Tailwind CSS
- 💍 Landing page with wedding
- 📝 RSVP form for guests
- 💾 Supabase backend for storing guest responses
- ⚡ Fast and optimized with Next.js App Router
- 🤖 AI-powered chat with Tavily search integration
- 📊 **Built-in metrics dashboard** for API monitoring
- 💰 Token usage tracking for cost management

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/GianclaudioCarella/wedding-web.git
cd wedding-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the Supabase database table:

Run the scripts in the database folder in your Supabase SQL editor

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

5``bash
npm run build
npm start
```

## Deployment

This project can be easily deployed to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/GianclaudioCarella/wedding-web)

Don't forget to add your environment variables in the Vercel project settings!

## Technologies Used

- [Next.js 15](https://nextjs.org/) - React framework
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Backend and database
- [Recharts](https://recharts.org/) - Chart library for metrics visualization
- [Tavily API](https://tavily.com/) - AI search integration

## Monitoring & Metrics 📊

This project includes a built-in metrics dashboard at `/admin/metrics`:

- **API Logs**: Track all API calls with response times
- **Token Usage**: Monitor LLM token consumption and costs
- **Tavily Metrics**: Cache hit rates and search performance
- **Cost Tracking**: Estimate and track API costs
- **Real-time Charts**: Live visualization with auto-refresh every 30s

Access at: [http://localhost:3000/admin/metrics](http://localhost:3000/admin/metrics)

## License

ISC
