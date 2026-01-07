# Cybersecurity Workshop - Kahoot-like Quiz Application

A modern, real-time quiz application built with Next.js, designed for cybersecurity workshops and interactive learning sessions. This application allows administrators to create sessions, manage participants, and conduct timed quizzes with live leaderboards.

## Features

### 👥 Participant Features
- **Session Joining**: Enter a session code to join active quiz sessions
- **Multi-Tab Support**: Test multiple participants from the same device using sessionStorage
- **Timed Questions**: Answer questions within configured time limits with a live countdown timer
- **Real-time Updates**: Receive instant feedback on correct/incorrect answers
- **Live Leaderboards**: View rankings and compare submission speeds with other participants
- **Waiting States**: Seamless transitions between questions with clear status indicators
- **Kick Handling**: Graceful handling when removed from a session by admin

### 🎯 Admin Features
- **Session Management**: 
  - Create multiple sessions with unique codes
  - View all sessions in a list format
  - Delete sessions
  - Select and switch between sessions
- **Participant Management**:
  - View all participants in real-time
  - Kick participants from sessions
  - Monitor correct/incorrect answers with participant names
- **Game Control**:
  - Start/stop questions with customizable time limits
  - Control progression between questions
  - Show/hide dashboards at will
  - Reset sessions and session codes
- **Analytics**:
  - Real-time participant count
  - Correct/incorrect answer tracking per question
  - Participant name lists for each category
  - Individual submission times

### 🎨 Design
- Modern, gradient-based UI with smooth animations
- Responsive design that works on all devices
- Intuitive session list and management interface
- Color-coded status indicators
- Real-time visual feedback

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Environment variables configured

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cybersec-helper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables) section)

4. Set up Supabase database (see [Supabase Setup](#supabase-setup) section)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_admin_password
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com)
2. Create a new project or select an existing one
3. Go to Project Settings > API
4. Copy the `Project URL` and `anon public` key

## Supabase Setup

### 1. Create Database Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Sessions table
CREATE TABLE sessions (
  session_code TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_question INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  question1_time_limit INTEGER,
  question2_time_limit INTEGER,
  question1_start_time TIMESTAMPTZ,
  question2_start_time TIMESTAMPTZ
);

-- Participants table
CREATE TABLE participants (
  id BIGSERIAL PRIMARY KEY,
  session_code TEXT REFERENCES sessions(session_code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_code, user_name)
);

-- Results table
CREATE TABLE results (
  id BIGSERIAL PRIMARY KEY,
  session_code TEXT REFERENCES sessions(session_code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  time_taken INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_participants_session ON participants(session_code);
CREATE INDEX idx_results_session ON results(session_code);
CREATE INDEX idx_results_question ON results(session_code, question_number);
```

### 2. Enable Row Level Security (Optional)

For production, you may want to configure RLS policies. By default, the application uses the anon key which should be restricted appropriately.

## Usage Guide

### For Administrators

1. **Access Admin Panel**
   - Navigate to `/admin`
   - Enter the admin password (default: `admin123` or set via `ADMIN_PASSWORD`)

2. **Create a Session**
   - Click "Create New Session" button
   - A unique 6-character session code will be generated
   - Share this code with participants

3. **Manage Sessions**
   - View all sessions in the sessions list
   - Click on a session to select it
   - Delete sessions using the trash icon

4. **Start a Quiz**
   - Select a session
   - Set time limit for Question 1 (in seconds)
   - Click "Start Question 1"
   - Participants will automatically be redirected to the question page

5. **Monitor Progress**
   - View participant count and status
   - See who answered correctly/incorrectly with names
   - Monitor real-time updates

6. **Show Dashboard**
   - Click "Show Dashboard 1" to reveal results to all participants
   - Or click "View Dashboard 1 (Admin)" to preview
   - Repeat for Question 2

7. **Reset Session**
   - "Reset Session": Clears progress but keeps participants
   - "Reset Session Code": Generates a new code (participants must rejoin)

### For Participants

1. **Join a Session**
   - Navigate to the home page or `/waiting`
   - Enter the session code provided by admin
   - Enter your name
   - Click "Join Session"

2. **Answer Questions**
   - Wait for admin to start Question 1
   - Enter your answer in the input field
   - Submit before time runs out
   - If correct, you'll see a "Correct!" message and wait for dashboard

3. **View Results**
   - After admin shows dashboard, view leaderboard
   - See your ranking and time compared to others
   - Wait for Question 2 to begin

4. **Continue to Question 2**
   - Admin will start Question 2
   - Answer and submit as before
   - View final results on Dashboard 2

## Project Structure

```
cybersec-helper/
├── app/
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── api/
│   │   ├── admin/
│   │   │   ├── action/       # Admin actions (start, reset, kick, etc.)
│   │   │   ├── auth/         # Admin authentication
│   │   │   └── sessions/     # Session list and deletion
│   │   ├── session/
│   │   │   ├── route.ts      # Session CRUD
│   │   │   └── join/         # Participant joining
│   │   └── results/          # Results submission and retrieval
│   ├── question/
│   │   ├── 1/page.tsx        # Question 1 page
│   │   └── 2/page.tsx        # Question 2 page
│   ├── dashboard/
│   │   └── [question]/       # Dynamic dashboard pages
│   ├── correct/
│   │   └── [question]/       # "Correct answer" waiting pages
│   ├── waiting/
│   │   └── page.tsx          # Session joining page
│   └── page.tsx              # Home page
├── lib/
│   └── supabase.ts           # Supabase client configuration
└── public/                   # Static assets
```

## Key Features Explained

### Real-time Updates
The application uses polling (2-3 second intervals) to update session status, participant lists, and results in real-time without requiring WebSockets.

### Session Management
- Each session has a unique 6-character code (uppercase letters and numbers)
- Sessions persist across server restarts thanks to Supabase
- Multiple sessions can run simultaneously

### Time Management
- Configurable time limits per question (default: 300 seconds / 5 minutes)
- Server-side time tracking ensures accuracy across clients
- Live countdown timer for participants

### State Management
- Session states: `waiting`, `question1`, `correct1`, `dashboard1`, `question2`, `correct2`, `dashboard2`, `finished`
- Individual participant states tracked separately
- Admin has full control over state transitions

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The application is optimized for Vercel deployment with proper Suspense boundaries and server-side rendering support.

## Configuration

### Changing Admin Password

Set the `ADMIN_PASSWORD` environment variable or modify the default in API routes.

### Customizing Questions

Edit the correct answers in:
- `app/question/1/page.tsx` - `correctAnswer` constant
- `app/question/2/page.tsx` - `correctAnswer` constant

### Styling

The application uses Tailwind CSS. Modify classes in component files or extend the Tailwind config.

## Troubleshooting

### Session Not Found Errors
- Ensure Supabase environment variables are set correctly
- Verify database tables are created
- Check Supabase connection in browser console

### Participants Not Appearing
- Check if session code is correct
- Verify participant was successfully added to database
- Check browser console for errors

### Build Errors
- Ensure all `useSearchParams()` calls are wrapped in Suspense
- Check TypeScript errors with `npm run build`
- Verify all environment variables are set

## Security Notes

- Admin password is stored in environment variables (change default!)
- Session codes are randomly generated (collision probability is very low)
- Consider implementing proper authentication for production
- Enable RLS policies in Supabase for additional security

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions, please open an issue on GitHub.
