# Concord26

**AI-Powered Stadium Operations Platform for FIFA World Cup 2026**

Unified real-time system coordinating 80,000+ fans, command centers, and field staff across 16 host cities with Google Gemini AI.

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.0_Flash-orange?logo=google)](https://ai.google.dev/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/Arunhere1907/concord26.git
cd concord26

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY from https://aistudio.google.com/apikey

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - the app works without API key using fallbacks!

---

## Features

- **AI-Powered Operations** - Gemini 2.0 Flash for incident triage, multilingual concierge, and tactical briefings
- **Three Unified Personas** - Fan portal, volunteer hub, and command center in real-time sync
- **Multilingual Support** - English, Spanish, German, Portuguese, French, Arabic
- **WCAG 2.1 AA Accessible** - Full keyboard navigation, semantic HTML, screen reader optimized
- **Real-Time Simulation** - Live crowd flow, gate loads, and transit updates
- **Interactive Stadium Map** - SVG visualization with incident overlay
- **Production Security** - Input validation, rate limiting, prompt injection resistance
- **Dark/Light Mode** - Theme persistence across sessions

---

## What is Concord26?

Three integrated interfaces for FIFA World Cup 2026 stadium operations:

| Interface | Description |
|-----------|-------------|
| **Fan Portal** | Multilingual AI concierge for wayfinding, transit advice, accessibility routing, live gate status |
| **Volunteer Hub** | Field staff incident reporting with AI auto-triage, SOP lookup, task management |
| **Command Center** | Operations dashboard with live monitoring, incident feed, AI copilot, stadium map |

---

## Demo Flow

1. **Interactive Workspace** view shows Command Center + Mobile side-by-side
2. **Volunteer App** (phone): Submit incident "Water spill at Gate B2"
3. Watch AI classify → Command Center updates → Map marker appears
4. **Fan Portal**: Ask "Where is nearest restroom?" in any language
5. **Command Copilot**: Get AI-generated tactical situation summary

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite 6
- **AI:** Google Gemini 2.0 Flash with structured JSON outputs
- **Deployment:** Vercel serverless functions
- **Testing:** Vitest, React Testing Library
- **Security:** Input validation, rate limiting, XSS prevention

---

## Project Structure

```
concord26/
├── api/                    # Vercel serverless functions
│   ├── orchestrator.ts     # Unified AI routing endpoint
│   └── state.ts           # Initial stadium data
├── lib/                    # Shared utilities
│   ├── security.ts         # Input validation, rate limiting
│   └── cache.ts           # FAQ response caching
├── src/
│   ├── components/         # React components
│   │   ├── FanApp.tsx
│   │   ├── VolunteerApp.tsx
│   │   └── CommandCenter.tsx
│   ├── data/              # Initial state and SOPs
│   └── types.ts           # TypeScript interfaces
├── tests/                 # Test suites
└── server.ts              # Local dev server
```

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Linting
npm run lint

# Type checking
npm run typecheck
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run lint         # Check code quality
npm run format       # Format code with Prettier
```

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Arunhere1907/concord26)

**Manual Deployment:**

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy (auto-detected as Vite project)

**Environment Variables:**

Set in Vercel Project Settings → Environment Variables:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

---

## Security Features

- Input validation and sanitization on all endpoints
- Rate limiting (30 requests/min per IP)
- Prompt injection resistance on fan chat
- XSS prevention (HTML/script tag stripping)
- Environment variables for all secrets
- File upload validation (type, size, extension)

---

## Accessibility

- WCAG 2.1 Level AA compliant
- Semantic HTML (`<nav>`, `<main>`, `<button>`)
- Full keyboard navigation with visible focus
- ARIA labels on all interactive elements
- Color contrast ratios meet 4.5:1 minimum
- Screen reader optimized
- Wheelchair route filtering with backend logic

---

## Why GenAI for Stadium Operations?

| Challenge | Concord26 Solution | Why AI Needed |
|-----------|-------------------|---------------|
| **Navigation** | Multilingual concierge | Natural language understanding beats keyword search |
| **Crowd Management** | Real-time rerouting | AI predicts congestion from sensor patterns |
| **Accessibility** | Voice interaction + smart routing | Serves mobility-impaired fans better than forms |
| **Transportation** | Departure timing advice | Correlates events with transit capacity |
| **Multilingual** | 6 languages with context | Fluent responses vs. literal translation |
| **Operations** | Incident auto-triage | Classifies "water spill" vs. "chest pain" instantly |

GenAI enables **adaptive coordination** for 80,000+ spectators, not just static dashboards.

---

## Key Differentiators

1. **Three Personas, One System** - Fan/volunteer/ops coordination in real-time
2. **Production Security** - Not a demo - includes rate limiting, validation, injection guards
3. **True Accessibility** - WCAG 2.1 AA with real wheelchair routing logic
4. **Scales to 16 Cities** - Multi-stadium architecture ready
5. **Offline-First** - Works without API key using rule-based fallbacks

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Acknowledgments

- **Google Gemini 2.0 Flash** - AI reasoning engine
- **Vercel** - Serverless deployment platform
- **React Team** - React 19 and ecosystem
- **FIFA World Cup 2026** - Inspiration for this project

---

## Contact

- **Repository:** [github.com/Arunhere1907/concord26](https://github.com/Arunhere1907/concord26)
- **Issues:** [GitHub Issues](https://github.com/Arunhere1907/concord26/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Arunhere1907/concord26/discussions)

---

<div align="center">
  <p><strong>Built for FIFA World Cup 2026</strong></p>
  <p>AI-powered coordination for 16 host cities across North America</p>
</div>
