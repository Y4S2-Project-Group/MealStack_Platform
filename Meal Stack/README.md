# Meal Stack Frontend

Frontend app for Meal Stack built with Vite + React + TypeScript.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Copy the example env file
   cp .env.example .env.local
   
   # The .env.local is already configured to point to AWS ALB
   # No changes needed unless you're running backend locally
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   
   App will be available at: `http://localhost:8080` (or `8081` if 8080 is in use)

### Environment Configuration

The app uses different API configurations for different environments:

- **Local Development** (`.env.local`):
  - Points to AWS ALB: `http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com`
  - Direct API calls to backend services on AWS
  
- **Vercel Production** (`.env.production`):
  - Empty `VITE_API_BASE_URL` (uses Vercel rewrites in `vercel.json`)
  - Proxies API requests through Vercel to avoid CORS issues

## 📜 Scripts

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build production assets
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run frontend tests (Vitest)
- `npm run test:watch` - Run tests in watch mode

## 🏗️ Tech Stack

- **Framework:** React 18.3.1
- **Build Tool:** Vite 6.0.11
- **Language:** TypeScript 5.7.3
- **UI Library:** shadcn/ui (48 components) + Radix UI primitives
- **Styling:** Tailwind CSS v3
- **State Management:** TanStack Query v5.83.0
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod
- **Notifications:** Sonner (toast notifications)

## 🎨 Design System

- **Primary Color:** Coral/Orange `hsl(11 67% 63%)`
- **Typography:** 
  - Sans-serif: DM Sans (default)
  - Display/Serif: Playfair Display (headers)
- **Border Radius:** 0.75rem
- **Components:** Modern, rounded corners, enhanced shadows, hover effects

## 🌐 Deployment

### Vercel (Production)

The app is deployed to Vercel and configured with API rewrites:

- **Production URL:** https://meal-stack-rosy.vercel.app
- **Deployment:** Automatic on push to `main` branch
- **Configuration:** See `vercel.json` for rewrites and SPA routing

### Manual Deployment

```bash
# Deploy to production
npx vercel --prod
```

## 📝 Notes

- Branding is set to "Meal Stack" in UI and HTML metadata
- Custom favicon with food delivery theme (burger icon)
- Currency displayed as LKR (Sri Lankan Rupees)
- Real-time updates via TanStack Query with polling intervals
- Cloudinary integration for image uploads (restaurants and menu items)
