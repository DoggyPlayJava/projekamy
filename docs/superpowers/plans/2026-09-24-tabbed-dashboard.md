# Floating Glass Navigation Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dense, single-page Smart Irrigation System dashboard into an aesthetic, spacious, multi-tab modular dashboard using a Floating Glass Tab Bar.

**Architecture:** Create a `NavigationTabs.tsx` component with 4 distinct modular tabs (`garden`, `weather-roi`, `schedules`, `analytics`), persist active tab in `localStorage`, and conditionally render each module with spacious layout and smooth `animate-fade-in` transitions.

**Tech Stack:** React 18, Vite, Tailwind CSS, Lucide React, Supabase Realtime.

## Global Constraints
- Preserve all existing hardware integrations, WebSocket subscriptions, Crop Presets, CSV export, and Offline Watchdog alerts.
- Header and OfflineBanner remain persistently visible above all tabs.
- Clean glassmorphism emerald & mint aesthetics.

---

### Task 1: Create `NavigationTabs.tsx` Component

**Files:**
- Create: `dashboard/src/components/NavigationTabs.tsx`

**Interfaces:**
- Props:
  - `activeTab: 'garden' | 'weather-roi' | 'schedules' | 'analytics'`
  - `onTabChange: (tab: 'garden' | 'weather-roi' | 'schedules' | 'analytics') => void`
  - `activeSchedulesCount: number`
  - `wateringLogsCount: number`

- [ ] **Step 1: Write `NavigationTabs.tsx`** with responsive glassmorphism design, active pill highlight, and badges.
- [ ] **Step 2: Test rendering with TypeScript build check**.

---

### Task 2: Integrate Tab Navigation in `App.tsx`

**Files:**
- Modify: `dashboard/src/App.tsx`

**Interfaces:**
- Consume: `NavigationTabs.tsx`
- State: `activeTab` with `localStorage` persistence

- [ ] **Step 1: Add `activeTab` state** in `App.tsx` with fallback to `'garden'`.
- [ ] **Step 2: Restructure the JSX layout** to render:
  - Header & OfflineBanner (persistent)
  - NavigationTabs
  - Conditionally rendered tab sections:
    - Tab `'garden'`: `StatsOverview` + 4 `PotCard`s
    - Tab `'weather-roi'`: `WeatherWidget` + `CostSavingWidget`
    - Tab `'schedules'`: `ScheduleManager`
    - Tab `'analytics'`: `MoistureChart` + `WateringLogTable`
- [ ] **Step 3: Ensure each tab container has ample breathing room** and clean typography headers.

---

### Task 3: Build Verification & Live Visual Inspection

**Files:**
- Test via Vite dev server & DevTools

- [ ] **Step 1: Run `npm run build`** to confirm zero compilation errors.
- [ ] **Step 2: Inspect all 4 tabs** using DevTools and take screenshots.
- [ ] **Step 3: Update documentation and walkthrough**.
