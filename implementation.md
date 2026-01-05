# Company Manager Portal - Implementation Plan

## Overview

Create a new independent Next.js project at c:\Users\S2\Documents\Wolf\work\nawabus\company-portal for company-specific management where:
Company employees (agent, driver, admin roles with company_id) manage only their own company data
All data operations automatically filtered by logged-in user's company_id
Independent UI components (not shared with admin-app)
Application-level filtering for security

## Technology Stack

- Framework: Next.js 15 with App Router
- Database/Auth: Supabase (same instance as admin-app)
- Styling: Tailwind CSS
- UI Components: Radix UI (independent copy from admin-app)
- Language: JavaScript (matching admin-app)
- Security Model: Authentication: Supabase Auth with phone number login, Authorization: Application-level company_id filtering on ALL queries

## Database Structure

The database structure is defined in `db-structure.json` located in the root folder (`/nawabus/db-structure.json`). This file contains the complete Supabase database schema including:

### Core Tables
- **auth.users** - Supabase authentication users
- **public.profiles** - User profiles with roles and company_id
- **public.companies** - Company information
- **public.buses** - Bus fleet data (company-scoped)
- **public.routes** - Route definitions (company-scoped)
- **public.trips** - Trip schedules (company-scoped)
- **public.tickets** - Ticket bookings
- **public.agent_locations** - Agent location data

### Key Relationships
- Users (profiles) belong to companies via `company_id`
- Buses, routes, and trips are scoped to companies
- Tickets reference trips and passengers
- All company-scoped tables include `company_id` for data isolation

### Security Features
- Row Level Security (RLS) enabled on most tables
- Company-based data filtering via `company_id`
- Role-based access control (admin, agent, driver, passenger)
- Automatic company_id validation in the company portal

**Note**: The company portal implementation MUST respect this database structure and always filter data by the authenticated user's `company_id`.

## Implementation Checklist

### Phase 1: Foundation Setup
- [x] Project Initialization
- [x] Install Dependencies
- [x] Environment Configuration
- [x] Copy Base Configuration Files
- [x] Create Core Library Files

### Phase 2: Authentication & Layout
- [x] Login System
- [x] Layout Components

### Phase 3: Core Features Implementation
- [x] Dashboard with Statistics
- [x] Buses Management
- [x] Routes Management
- [x] Trips Management
- [x] Employees Management
- [x] Tickets View (Read-Only)

### Phase 4: Security Implementation
- [ ] Standard API Route Pattern
- [ ] Server Component Protection

### Phase 5: Project Structure
- [ ] Complete Directory Structure

## Detailed Implementation Steps

### Phase 1: Foundation Setup (COMPLETED)
#### 1.1 Project Initialization
- [x] cd c:\Users\S2\Documents\Wolf\work\nawabus
- [x] npx create-next-app@latest company-portal --no-typescript --eslint --tailwind --no-src-dir --app --import-alias "'*'"

#### 1.2 Install Dependencies
- [x] cd company-portal
- [x] npm install @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select @radix-ui/react-slot @supabase/ssr @supabase/supabase-js class-variance-authority clsx lucide-react recharts tailwind-merge tailwindcss-animate

#### 1.3 Environment Configuration
- [x] Create .env.local with same Supabase credentials as admin-app:
  - NEXT_PUBLIC_SUPABASE_URL=https://rplqkkfhlgbtuqwassfh.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=[from admin-app]
  - SUPABASE_SERVICE_ROLE_KEY=[from admin-app]

#### 1.4 Copy Base Configuration Files
- [x] Copy tailwind.config.js from admin-app
- [x] Copy app/globals.css from admin-app
- [x] Copy components.json from admin-app

#### 1.5 Create Core Library Files
- [x] lib/supabase.js - Browser Supabase client
- [x] lib/auth.js - Auth helpers with company validation (requireCompanyUser())
- [x] lib/utils.js - Copy from admin-app (cn() utility)

### Phase 2: Authentication & Layout

#### 2.1 Login System
- [x] app/login/page.js - Company-aware login:
  - Copy from admin-app
  - After successful login, verify user has company_id
  - If no company_id, deny access and sign out
  - If valid, redirect to dashboard
- [x] app/api/auth/callback/route.js - Copy from admin-app for session sync

#### 2.2 Layout Components
- [x] app/layout.js - Root layout with metadata components/ClientLayout.js - Client wrapper with auth:
  - Copy from admin-app
  - Simplified (no driver-specific logic)
- [x] components/Sidebar.js - Company portal navigation:
  - Sections: Dashboard (/), Buses (/buses, /add-bus), Routes (/routes, /add-route), Trips (/trips, /add-trip), Employees (/employees, /add-employee), Tickets (/tickets) [View Only], Logout

### Phase 3: Core Features Implementation

#### 3.1 Dashboard with Statistics
- [x] Files: app/page.js, app/api/company/stats/route.js, components/StatisticsDashboard.js
- [x] Pattern: Server Component with requireCompanyUser() guard, API filters by company_id

#### 3.2 Buses Management
- [x] Files: app/buses/page.js - List view, app/add-bus/page.js - Add form, app/api/company/buses/route.js - API (GET, POST, PATCH, DELETE), components/AddBusForm.js - Form component
- [x] Key Changes: Remove company selector dropdown, accept companyId as prop, all queries: .eq('company_id', companyId)

#### 3.3 Routes Management
- [x] Files: app/routes/page.js - List view, app/add-route/page.js - Add form, app/api/company/routes/route.js - API (GET, POST, PATCH, DELETE), components/AddRouteForm.js - Form component
- [x] Important: Routes are company-scoped (each company manages their own routes)

#### 3.4 Trips Management
- [x] Files: app/trips/page.js - List view with filters, app/add-trip/page.js - Add form, app/api/company/trips/route.js - API (GET, POST, PATCH, DELETE), components/TripForm.js - Complex form
- [x] Critical Implementation: TripForm with company-scoped dropdowns (routes, buses, drivers)

#### 3.5 Employees Management
- [x] Files: app/employees/page.js - List view, app/add-employee/page.js - Add form, app/api/company/employees/route.js - GET only, app/api/company/users/route.js - POST only (create), components/AddEmployeeForm.js - Form component
- [x] Pattern: List employees with company filter, create employee for own company

#### 3.6 Tickets View (Read-Only)
- [x] Files: app/tickets/page.js - List view only, app/api/company/tickets/route.js - GET only (no POST/PATCH/DELETE)
- [x] Query Pattern: Join filter for company trips

### Phase 4: Security Implementation

#### 4.1 Standard API Route Pattern
- [ ] Every API route MUST follow pattern:
  - Authenticate user
  - Get company_id from profile
  - ALL queries filter by companyId
  - For updates/deletes, verify ownership

#### 4.2 Server Component Protection
- [ ] All protected pages use requireCompanyUser() guard

### Phase 5: Project Structure
```
company-portal/
├── app/
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Dashboard with stats
│   ├── globals.css               # Copied from admin-app
│   ├── login/page.js             # Company-aware login
│   ├── buses/page.js             # List buses
│   ├── add-bus/[page.js, layout.js]
│   ├── routes/page.js            # List routes
│   ├── add-route/[page.js, layout.js]
│   ├── trips/page.js             # List trips
│   ├── add-trip/[page.js, layout.js]
│   ├── employees/page.js         # List employees
│   ├── add-employee/[page.js, layout.js]
│   ├── tickets/page.js           # View tickets (read-only)
│   └── api/
│       ├── auth/callback/route.js
│       └── company/
│           ├── stats/route.js
│           ├── buses/route.js
│           ├── routes/route.js
│           ├── trips/route.js
│           ├── employees/route.js
│           ├── users/route.js
│           └── tickets/route.js
├── components/
│   ├── ClientLayout.js
│   ├── Sidebar.js
│   ├── StatisticsDashboard.js
│   ├── AddBusForm.js
│   ├── AddRouteForm.js
│   ├── TripForm.js
│   ├── AddEmployeeForm.js
│   └── ui/ [copied from admin-app]
├── lib/
│   ├── auth.js                   # requireCompanyUser()
│   ├── supabase.js               # Browser client
│   └── utils.js                  # cn() utility
├── .env.local                    # Supabase credentials
├── tailwind.config.js            # Copied from admin-app
├── components.json               # Copied from admin-app
├── next.config.mjs
└── package.json
```

## Implementation Order

### Setup (30 min) - COMPLETED
- [x] Create Next.js project
- [x] Install dependencies
- [x] Copy config files and UI components
- [x] Create lib files

### Auth Foundation (45 min)
- [ ] Create lib/auth.js with requireCompanyUser()
- [ ] Create login page with company validation
- [ ] Create auth callback route
- [ ] Test login flow

### Layout (30 min)
- [ ] Create root layout
- [ ] Create ClientLayout
- [ ] Create Sidebar
- [ ] Test navigation

### Dashboard & Stats (1 hour)
- [ ] Create homepage
- [ ] Create stats API route
- [ ] Adapt StatisticsDashboard component
- [ ] Test company-scoped statistics

### Buses Module (1 hour)
- [ ] Create buses API route (CRUD)
- [ ] Create buses list page
- [ ] Create add-bus page and form
- [ ] Test CRUD operations

### Routes Module (1 hour)
- [ ] Create routes API route (CRUD)
- [ ] Create routes list page
- [ ] Create add-route page and form
- [ ] Test CRUD operations

### Trips Module (1.5 hours)
- [ ] Create trips API route (CRUD)
- [ ] Create trips list page
- [ ] Create add-trip page
- [ ] Adapt TripForm with company filtering
- [ ] Test with company-scoped dropdowns

### Employees Module (1 hour)
- [ ] Create employees API route
- [ ] Create users API route (for creation)
- [ ] Create employees list page
- [ ] Create add-employee page and form
- [ ] Test employee creation

### Tickets Module (30 min)
- [ ] Create tickets API route (GET only)
- [ ] Create tickets list page
- [ ] Test read-only access

### Testing & Polish (1 hour)
- [ ] Test all company_id filters
- [ ] Test data isolation between companies
- [ ] Add error handling
- [ ] Verify security patterns

## Key Differences from Admin-App

- **Access**: Super admins only → Company employees only
- **Data Scope**: All companies → Single company (auto-filtered)
- **Company Selection**: Manual dropdown → Automatic from user profile
- **Routes**: System-wide → Company-specific
- **Tickets**: Full CRUD → View only
- **Messages**: Included → Not included
- **Employee Creation**: Any company → Own company only
- **UI Components**: Original → Independent copy

## Critical Security Reminders

✅ Never trust client input - Always fetch company_id from user's profile on server
✅ Filter all queries - Every database query MUST include .eq('company_id', companyId)
✅ Verify ownership - Updates/deletes must check company_id ownership
✅ Protect all routes - Use requireCompanyUser() on all protected pages
✅ RPC functions - Pass company_id as parameter, never from client

## Testing Checklist

- [ ] Login with company employee succeeds
- [ ] Login without company_id fails
- [ ] Dashboard shows only company statistics
- [ ] Buses list shows only company buses
- [ ] Cannot edit/delete other company's buses
- [ ] Routes are company-scoped
- [ ] Trips show only company buses/drivers/routes
- [ ] Employees list shows only company employees
- [ ] Tickets show only company trip tickets
- [ ] Cannot access other company data via API manipulation

## Reference Files from Admin-App

Key files to reference during implementation:
- admin-app/lib/auth.js - Auth pattern
- admin-app/components/AddBusForm.js - Form pattern
- admin-app/components/TripForm.js - Complex form with dropdowns
- admin-app/app/login/page.js - Login flow
- admin-app/components/StatisticsDashboard.js - Stats component

## Current Status

**Phase 1: Foundation Setup - COMPLETED** ✅
- Next.js project created and configured
- All dependencies installed
- Configuration files copied
- UI components created
- Core library files implemented

**Phase 2: Authentication & Layout - COMPLETED** ✅
- Company-aware login system with company_id validation
- Auth callback route for session management
- Root layout with Portuguese metadata
- ClientLayout with company employee authentication
- Sidebar with company-specific navigation menu

**Phase 3: Core Features Implementation - COMPLETED** ✅
- Dashboard with company-scoped statistics
- Full CRUD buses management with company filtering
- Routes management scoped to company
- Trips management with company relationships
- Employees management and creation
- Tickets view with read-only access

**Ready for Phase 4: Security Implementation**

**Total Estimated Time**: ~8-9 hours
**Time Completed**: ~5-6 hours (All core features)
**Time Remaining**: ~2-3 hours
