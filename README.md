# FocusPlus - Study Management System

FocusPlus is an intelligent study companion that helps you manage your study schedule, track your progress, and optimize your learning with AI-powered insights.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account for backend services
- OpenAI API key for AI features

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd focusplus-main

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For Supabase Edge Functions, configure the following secret:
- `OPENAI_API_KEY` - Your OpenAI API key for AI features

## FocusPlus Features

### Smart Revision Engine
Automatically detects weak topics based on your study patterns and generates a personalized revision plan.

**How it works:**
1. Navigate to the **Planner** page
2. Find the **Smart Revision** panel in the right sidebar
3. Click **Generate Revision Plan**
4. View your weak topics ranked by weakness score
5. Click **Add to Timetable** to schedule revision sessions

**Weakness scoring factors:**
- Missed sessions (40% weight)
- AI difficulty ratings (30% weight)
- Incomplete tasks (20% weight)
- Student difficulty reviews (10% weight)

### Missed Session Auto-Replanner
When you miss a study session, the system automatically reschedules it to the next available day.

**How it works:**
1. When a session is marked as missed, the system calls `/timetable/replan`
2. The algorithm finds the next day with available capacity
3. A modal shows the before/after comparison with an explanation
4. The new session is automatically added to your schedule

**Replan logic:**
- Respects maximum 4 sessions per day
- Prefers days with lighter workload
- Provides human-readable explanations for each move

## Technologies Used

This project is built with:

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Edge Functions)
- **AI**: OpenAI API for intelligent features
- **State Management**: TanStack Query (React Query)

## Deployment

This project can be deployed to any static hosting service that supports React applications:

- **Vercel**: Connect your GitHub repository and deploy
- **Netlify**: Use the build command `npm run build` and publish directory `dist`
- **Cloudflare Pages**: Connect repository and use default Vite settings
- **Custom Server**: Build with `npm run build` and serve the `dist` directory

### Environment Variables for Deployment

Make sure to configure these environment variables in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions

Deploy edge functions using the Supabase CLI:
```sh
supabase functions deploy ai-chat
supabase functions deploy task-difficulty
supabase functions deploy timetable-generate
supabase functions deploy revision-plan
```

Don't forget to set the `OPENAI_API_KEY` secret in Supabase.
