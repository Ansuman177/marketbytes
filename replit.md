# MarketBytes - Real-Time Stock Market News App

## Overview

MarketBytes is a mobile-first stock market news aggregation platform inspired by Inshorts. It delivers bite-sized, AI-summarized financial news in a vertical card-style feed, focusing on Indian stock markets (NSE/BSE). The app provides real-time news updates with automatic entity recognition for stock tickers, sectors, and key topics, helping investors stay informed with concise 60-word summaries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state management and caching
- **Design System**: Dark theme with green accent colors, mobile-first responsive design

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Development**: TypeScript with tsx for development server
- **Storage**: In-memory storage implementation with interface for future database integration
- **API Design**: RESTful endpoints for news retrieval, search, and article management
- **Error Handling**: Centralized error middleware with structured error responses

### Data Storage Solutions
- **Database**: Configured for PostgreSQL with Drizzle ORM
- **Schema**: Defined tables for users, news articles, and watchlist items
- **Migration**: Drizzle Kit for schema migrations and database management
- **Current Implementation**: MemStorage class for development/testing with full CRUD operations

### News Processing Pipeline
- **News Sources**: NewsAPI integration focusing on Indian financial sources (Economic Times, Times of India)
- **AI Processing**: OpenAI GPT-5 integration for content summarization and entity extraction
- **Content Analysis**: Automatic identification of Indian stock tickers, sectors, and financial topics
- **Real-time Updates**: Periodic news fetching with AI-powered content processing

### Mobile-First Design
- **Navigation**: Bottom navigation bar with three main sections (Home, Search, Watchlist)
- **Card Interface**: Vertical scrolling news cards with infinite scroll pagination
- **Responsive Layout**: Optimized for mobile devices with touch-friendly interactions
- **Performance**: Lazy loading and optimistic updates for smooth user experience

## External Dependencies

### Core Infrastructure
- **Neon Database**: PostgreSQL serverless database service (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database operations and schema management
- **NewsAPI**: Financial news aggregation service for Indian markets
- **OpenAI API**: GPT-5 model for news summarization and entity extraction

### Frontend Libraries
- **TanStack Query**: Server state management and caching layer
- **Radix UI**: Accessible component primitives for UI elements
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Minimalist client-side routing
- **React Hook Form**: Form handling with validation

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Plugins**: Development environment integration

### Authentication & Sessions
- **Connect PG Simple**: PostgreSQL session store for user sessions
- **Express Session**: Session management middleware

### UI Enhancement
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe component variant management
- **Embla Carousel**: Touch-friendly carousel components

The application is designed to scale from the current in-memory storage to a full PostgreSQL deployment while maintaining the same API interface and user experience.