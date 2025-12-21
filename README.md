# Wedding Web Page

A beautiful, responsive wedding invitation website built with Next.js, React, and Supabase.

## Features

- 📱 Mobile-responsive design
- 🎨 Modern, elegant UI with Tailwind CSS
- 💍 Landing page with wedding illustration placeholder
- 📝 RSVP form for guests
- 💾 Supabase backend for storing guest responses
- ⚡ Fast and optimized with Next.js App Router

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

Run this SQL in your Supabase SQL editor:

```sql
-- Create the rsvp_responses table
CREATE TABLE rsvp_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  attending TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT attending_check CHECK (attending IN ('yes', 'no', 'perhaps'))
);

-- Enable Row Level Security
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert
CREATE POLICY "Anyone can insert RSVP responses"
  ON rsvp_responses
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create a policy that allows authenticated users to view all responses
CREATE POLICY "Authenticated users can view RSVP responses"
  ON rsvp_responses
  FOR SELECT
  TO authenticated
  USING (true);
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
wedding-web/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   └── rsvp/
│       └── page.tsx        # RSVP form page
├── lib/
│   └── supabase.ts         # Supabase client configuration
├── public/                 # Static files (add your wedding illustration here)
└── ...config files
```

## Customization

### Adding Your Wedding Illustration

Replace the placeholder in `app/page.tsx` with your actual wedding illustration:

1. Add your image to the `public` folder (e.g., `public/wedding-illustration.jpg`)
2. Update the landing page to use the image:

```tsx
<Image
  src="/wedding-illustration.jpg"
  alt="Wedding Illustration"
  width={500}
  height={500}
  className="rounded-lg shadow-2xl"
/>
```

### Customizing Colors

The color scheme uses Tailwind's rose palette. To change colors, edit the class names in:
- `app/page.tsx` - Landing page
- `app/rsvp/page.tsx` - RSVP form

## Building for Production

```bash
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

## License

ISC
