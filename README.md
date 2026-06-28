# Wedding Web Page

A responsive wedding invitation website built with Next.js, React, and Supabase.

## Features

- Mobile-responsive design
- Modern, elegant UI with Tailwind CSS
- Personalized guest invitations via unique link
- RSVP form with confirmation flow
- Multilingual support (Portuguese and Spanish)
- Email system for invitations, RSVP confirmations, and accommodation info
- Full admin dashboard for wedding management
- AI-powered assistant chat for planning
- API metrics dashboard for monitoring

## Admin Dashboard

Available at `/admin`, includes:

- **Guests** — manage guest list, RSVP status, and send invitations
- **Events** — manage wedding events and details
- **Accommodation** — manage lodging options and send accommodation emails
- **Registry** — manage gift registry
- **Transport** — manage transport logistics
- **Content** — manage site content
- **Inspiration** — mood board and inspiration management
- **Planning** — general planning tools
- **Chat** — AI assistant (GPT-4o via GitHub Models) with tools for guest stats, event info, document search, memory, and web search (Tavily)
- **Metrics** — API monitoring, token usage tracking, and cost estimation

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account and project
- GitHub token (for AI chat — GitHub Models)
- Resend API key (for emails)
- Tavily API key (for AI web search, optional)

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

3. Set up environment variables — copy `.env.example` to `.env.local` and fill in:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
```

4. Set up the Supabase database — run the scripts in the `database/` folder in your Supabase SQL editor.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This project can be deployed to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/GianclaudioCarella/wedding-web)

Add your environment variables in the Vercel project settings.

## Technologies Used

- [Next.js 16](https://nextjs.org/) — React framework
- [React 19](https://react.dev/) — UI library
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Tailwind CSS v4](https://tailwindcss.com/) — Styling
- [Supabase](https://supabase.com/) — Backend and database
- [Resend](https://resend.com/) — Email delivery
- [Recharts](https://recharts.org/) — Charts for metrics dashboard
- [React Markdown](https://github.com/remarkjs/react-markdown) — Markdown rendering in chat
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) — PDF document parsing
- [Tavily API](https://tavily.com/) — Web search for AI assistant

## License

ISC
