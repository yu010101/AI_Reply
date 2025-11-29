# Development Rules

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Emotion (for specific components)
- **UI Library**: Material UI (@mui/material)
- **State Management**: React Context, Hooks
- **Data Fetching**: SWR or custom hooks with `fetch`

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Serverless**: AWS Lambda (via `src/backend/functions`)
- **API**: Next.js API Routes (`pages/api`)

### Testing
- **Unit/Integration**: Jest, React Testing Library
- **E2E**: Playwright

## Directory Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Next.js pages (routes)
├── styles/         # Global styles
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── contexts/       # React Context definitions
├── types/          # TypeScript type definitions
└── backend/        # Backend logic (Lambda functions, etc.)
```

## Naming Conventions

- **Files**: `kebab-case.ts` / `kebab-case.tsx` (e.g., `user-profile.tsx`)
- **Components**: `PascalCase` (e.g., `UserProfile`)
- **Functions/Variables**: `camelCase` (e.g., `getUserProfile`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Interfaces/Types**: `PascalCase` (e.g., `UserInterface`)

## Git Workflow

1.  **Main Branch**: `main` (Production-ready code)
2.  **Feature Branches**: `feature/feature-name`
3.  **Bug Fixes**: `fix/bug-description`
4.  **Commits**: Conventional Commits (e.g., `feat: add login page`, `fix: resolve auth error`)

## Coding Standards

- **TypeScript**: Use strict mode. Avoid `any` whenever possible. Define interfaces for props and state.
- **React**: Use Functional Components and Hooks. Avoid Class Components.
- **Imports**: Group imports: external libraries first, then internal modules.
- **Comments**: Document complex logic. Use JSDoc for utility functions.
