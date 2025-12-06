# Overview

This is a Facebook login page clone built as a full-stack application. The project replicates Facebook's web login interface with a multi-step verification flow. It uses React for the frontend with shadcn/ui components, Express for the backend API, and is configured to use PostgreSQL with Drizzle ORM for data persistence.

The application features a responsive design that adapts between desktop and mobile layouts, following Facebook's design system with specific typography, spacing, and color schemes.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build Tool**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Client-side routing using Wouter (lightweight alternative to React Router)

**UI Component System**
- shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Components follow the "New York" style variant
- Custom CSS variables for theming (Facebook blue: `214 89% 52%`, Facebook green: `141 53% 53%`)

**Design System**
- System font stack prioritizing native OS fonts
- Responsive breakpoint at 768px for mobile/desktop distinction
- Two-column desktop layout (60/40 split) that stacks on mobile
- Facebook-specific design tokens defined in `index.css`

**State Management**
- React Hook Form with Zod validation for form handling
- TanStack Query (React Query) for server state management
- Custom hooks for mobile detection and toast notifications

**Key Design Decisions**
- Exact visual replication of Facebook's login interface per `design_guidelines.md`
- Multi-step verification flow with loading states
- Form validation handled client-side before API submission

## Backend Architecture

**Server Framework**
- Express.js with TypeScript
- HTTP server created with Node's built-in `http` module
- Middleware for JSON parsing and URL-encoded bodies

**Development vs Production**
- Development: Vite middleware for HMR and fast refresh
- Production: Serves static build from `dist/public`
- Custom logging middleware for request/response tracking

**API Design**
- RESTful API endpoints prefixed with `/api`
- Credentials included in fetch requests for session management
- Storage abstraction layer via `IStorage` interface

**Build Process**
- ESBuild for server bundling with selective dependency bundling
- Allowlist approach for commonly used dependencies to reduce syscalls
- Separate client (Vite) and server (ESBuild) build processes

## Data Layer

**ORM & Database**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the target database (configured in `drizzle.config.ts`)
- Schema-first approach with migrations in `/migrations` directory

**Schema Design**
- Users table with id (UUID), username, and password fields
- Zod schemas derived from Drizzle tables for validation
- Type inference for Insert and Select operations

**Storage Pattern**
- Abstract `IStorage` interface for CRUD operations
- In-memory implementation (`MemStorage`) for development/testing
- Production implementation would swap to actual database queries
- UUID generation using Node's crypto module

**Migration Strategy**
- `drizzle-kit push` command for schema synchronization
- Schema definitions in `shared/schema.ts` for frontend/backend sharing

## External Dependencies

**UI Component Libraries**
- @radix-ui/* - Headless UI primitives (accordion, dialog, dropdown, etc.)
- embla-carousel-react - Carousel functionality
- cmdk - Command palette component
- lucide-react - Icon library

**Form & Validation**
- react-hook-form - Form state management
- @hookform/resolvers - Validation resolver integration
- zod - Schema validation
- drizzle-zod - Bridge between Drizzle and Zod schemas

**Styling**
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Component variant management
- clsx & tailwind-merge - Conditional class composition

**Server Dependencies**
- express-session - Session management (implied for user authentication)
- connect-pg-simple - PostgreSQL session store
- pg - PostgreSQL client (via Drizzle)

**Development Tools**
- tsx - TypeScript execution for development
- vite - Frontend build tool and dev server
- @replit/vite-plugin-* - Replit-specific development plugins

**Database & ORM**
- drizzle-orm - Type-safe ORM
- drizzle-kit - CLI for migrations and schema management
- Connection string expected in `DATABASE_URL` environment variable

**Potential Future Integrations**
- Password hashing library (bcrypt/argon2) for secure authentication
- Email service for verification codes (nodemailer present in package.json)
- Rate limiting for login attempts (express-rate-limit in package.json)