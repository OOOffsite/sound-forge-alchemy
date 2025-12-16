# Component Dependency Map - Sound Forge Alchemy

## Application Architecture

```
App (Root)
├── QueryClientProvider (@tanstack/react-query)
├── WebSocketProvider (socket.io-client)
├── TooltipProvider (@radix-ui/react-tooltip)
├── ModuleRegistryProvider (zustand)
│   └── BrowserRouter (react-router-dom)
│       ├── Toaster (UNUSED - Remove)
│       ├── Sonner (KEEP - Main notification system)
│       ├── ModuleSelector
│       └── Routes
│           ├── Home (/)
│           ├── Index (/alchemy/session) ← MAIN APP
│           ├── About (/about)
│           └── NotFound (*)
```

---

## Page: Index (Main Application)

```
Index.tsx
├── MainLayout
│   └── StickyPlayer
│       └── VolumeVisualizer
│           └── WaveSurfer.js
│
├── InputPanel
│   ├── Input (UI)
│   └── Button (UI)
│
├── PlaylistPanel
│   └── TrackList
│       ├── Card (UI)
│       └── Button (UI)
│
├── AudioProcessor
│   ├── Card (UI)
│   ├── Button (UI)
│   ├── Slider (UI)
│   └── Select (UI)
│
├── StemVisualizer (when stems available)
│   ├── Card (UI)
│   ├── Button (UI)
│   ├── Toggle (UI)
│   └── Slider (UI)
│
└── ExportStemsPanel (when stems available)
    ├── Card (UI)
    ├── Button (UI)
    └── Dialog (UI)
```

---

## Audio Components Dependency Chain

```
StemViewer (513 lines) ← Most Complex Audio Component
├── WaveSurfer.js (7.9.5)
├── wavesurfer.js/plugins/regions
├── WebMidi (3.1.12)
├── Button (UI)
├── Slider (UI)
├── Toggle (UI)
├── Select (UI)
├── Card (UI)
└── Custom: midiHandlers.ts
    ├── useMIDIControlChange
    └── useMIDINoteOn

StemVisualizer (262 lines)
├── Card (UI)
├── Button (UI)
├── Toggle (UI)
└── Slider (UI)

AudioProcessor (486 lines)
├── Card (UI)
├── Button (UI)
├── Slider (UI)
├── Select (UI)
└── Sonner (toast)

VolumeVisualizer (160 lines)
├── WaveSurfer.js
└── useTheme hook

StickyPlayer (225 lines)
├── VolumeVisualizer
├── Lucide Icons
└── MediaSession API (native)
```

---

## Actually Used UI Components (15/60)

```
CORE (13 components - KEEP ALL)
├── button         ← Used 8 times
├── card           ← Used 8 times
├── input          ← Used 1 time
├── label          ← Used 2 times
├── slider         ← Used 1 time
├── select         ← Used 1 time
├── dialog         ← Used 1 time
├── tooltip        ← Used 2 times
├── toast          ← Used 2 times (keep for toaster)
├── sonner         ← Used 4 times (MAIN NOTIFICATION)
├── dropdown-menu  ← Used 1 time
├── switch         ← Used 1 time
└── toggle         ← Used 1 time

CUSTOM (2 components - KEEP)
├── StickyPlayer
└── VolumeVisualizer
```

---

## Unused UI Components (45/60) - REMOVE ALL

```
SHADCN BLOAT (35 components)
├── accordion
├── alert-dialog
├── alert
├── aspect-ratio
├── avatar
├── badge
├── breadcrumb
├── calendar        ← pulls in date-fns (200kb!)
├── carousel        ← pulls in embla-carousel (35kb)
├── checkbox
├── collapsible
├── command         ← pulls in cmdk (35kb)
├── context-menu
├── drawer          ← pulls in vaul (25kb)
├── form
├── hover-card
├── input-otp       ← pulls in input-otp (8kb)
├── menubar
├── navigation-menu
├── pagination
├── popover
├── progress
├── radio-group
├── resizable       ← pulls in react-resizable-panels (40kb)
├── scroll-area
├── separator
├── sheet
├── sidebar         ← 687 lines of complexity!
├── skeleton
├── table
├── tabs
├── textarea
└── toggle-group

UNUSED PAGES (4 components)
├── Dashboard       ← Not in active routes
├── TrackLibrary    ← Not in active routes
├── SearchPage      ← Not in active routes
└── ErrorPage       ← Not in active routes

UNUSED CUSTOM (6 components)
├── DebugConsoleOverlay  ← Not actively used
├── NotificationLog      ← Duplicate of Sonner
├── OverlayGrid         ← Module system unused
└── SettingsDropdown    ← Not visible in UI
```

---

## Dependency Tree Analysis

### 🟢 **Essential Dependencies (38 total)**

```
REACT CORE (3)
├── react (18.3.1)
├── react-dom (18.3.1)
└── react-router-dom (6.26.2)

AUDIO (3)
├── wavesurfer.js (7.9.5)          ← Core audio visualization
├── webmidi (3.1.12)               ← MIDI support
└── [ADD] tone (15.0.0)            ← Professional audio framework

STATE & DATA (3)
├── @tanstack/react-query (5.75.5) ← Server state
├── zustand (5.0.4)                ← Client state
└── socket.io-client (4.8.1)       ← WebSocket

UI LIBRARIES (9 Radix packages)
├── @radix-ui/react-dialog
├── @radix-ui/react-dropdown-menu
├── @radix-ui/react-label
├── @radix-ui/react-popover
├── @radix-ui/react-select
├── @radix-ui/react-slider
├── @radix-ui/react-slot
├── @radix-ui/react-switch
├── @radix-ui/react-tabs
└── @radix-ui/react-toast
    @radix-ui/react-toggle
    @radix-ui/react-tooltip

UI UTILITIES (4)
├── lucide-react (0.462.0)         ← Icons
├── sonner (1.5.0)                 ← Toast notifications
├── next-themes (0.3.0)            ← Theme switching
└── recharts (2.12.7)              ← Charts (if used)

STYLING (4)
├── tailwindcss (3.4.11)
├── tailwind-merge (2.6.0)
├── class-variance-authority (0.7.1)
└── tailwindcss-animate (1.0.7)

FORMS & VALIDATION (3)
├── react-hook-form (7.53.0)
├── @hookform/resolvers (3.9.0)
└── zod (3.23.8)

UTILITIES (3)
├── axios (1.9.0)
├── clsx (2.1.1)
└── [ADD] nanoid (5.0.0)

API (1)
└── @supabase/supabase-js (2.49.4)

NEW ADDITIONS (2)
├── @wavesurfer/react (1.0.0)      ← Better WaveSurfer integration
└── react-h5-audio-player (3.9.0)  ← Professional audio player
```

### 🔴 **Remove Dependencies (24 total - ~500kb)**

```
CALENDAR GROUP (2 - 260kb!)
├── date-fns (200kb)               ← ONLY used by calendar
└── react-day-picker (60kb)        ← calendar unused

CAROUSEL (1 - 35kb)
└── embla-carousel-react (35kb)    ← carousel unused

DRAG & DROP (2 - 57kb)
├── @dnd-kit/core (45kb)           ← Not implemented
└── @dnd-kit/utilities (12kb)      ← Not implemented

PANEL/LAYOUT (2 - 65kb)
├── react-resizable-panels (40kb)  ← Not using
└── react-draggable (25kb)         ← Not dragging

COMMAND & DRAWER (3 - 95kb)
├── cmdk (35kb)                    ← command palette unused
├── vaul (25kb)                    ← drawer unused
└── input-otp (8kb)                ← OTP input unused

UNUSED RADIX (14 - ~230kb)
├── @radix-ui/react-accordion
├── @radix-ui/react-alert-dialog
├── @radix-ui/react-aspect-ratio
├── @radix-ui/react-avatar
├── @radix-ui/react-checkbox
├── @radix-ui/react-collapsible
├── @radix-ui/react-context-menu
├── @radix-ui/react-hover-card
├── @radix-ui/react-menubar
├── @radix-ui/react-navigation-menu
├── @radix-ui/react-progress
├── @radix-ui/react-radio-group
├── @radix-ui/react-scroll-area
└── @radix-ui/react-separator

TOTAL REMOVABLE: ~500kb+ gzipped
```

---

## Refactor Impact Map

```
BEFORE REFACTOR
├── Components: 93
│   ├── Used: 48 (52%)
│   └── Unused: 45 (48%) ← REMOVE
│
├── Dependencies: 58
│   ├── Used: 34 (59%)
│   └── Unused: 24 (41%) ← REMOVE
│
└── Bundle: ~2.5MB
    ├── Essential: ~1.2MB
    └── Bloat: ~1.3MB (52%) ← REMOVE

AFTER REFACTOR
├── Components: 35 (-62%)
│   ├── Audio: 7
│   ├── Layout: 5
│   ├── Pages: 4
│   ├── UI: 15
│   └── Modules: 4
│
├── Dependencies: 38 (-34%)
│   ├── Removed: 24
│   └── Added: 4 (better quality)
│
└── Bundle: ~1.2MB (-52%)
    ├── Core: ~800kb
    ├── Audio: ~250kb
    └── UI: ~150kb
```

---

## Component Replacement Strategy

```
CURRENT                          NEW/IMPROVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Custom VolumeVisualizer    →    @wavesurfer/react
(160 lines, complex)              (hook-based, 20 lines)

Custom StickyPlayer        →    react-h5-audio-player
(225 lines, basic)                (feature-rich, themed)

sidebar (687 lines!)       →    Simplified (150 lines)
                                + @radix-ui/react-collapsible

chart wrapper (363 lines)  →    Direct recharts usage
                                (remove unnecessary wrapper)

3 notification systems     →    Sonner only
(Toaster, Sonner, Log)           (modern, better UX)

3 layout components        →    Single Layout pattern
(AppLayout, MainLayout)          (slots-based composition)

menubar (234 lines)        →    REMOVE (use dropdown-menu)

navigation-menu            →    Simple Link components
                                (over-engineered)
```

---

## File Size Reference

```
LARGEST COMPONENTS (before refactor)
1. sidebar.tsx                687 lines
2. StemViewer.tsx            513 lines
3. ArrangementDetector.tsx   491 lines
4. AudioProcessor.tsx        486 lines
5. TrackStudio.tsx          411 lines
6. TrackList.tsx            388 lines
7. chart.tsx                363 lines
8. StemVisualizer.tsx       262 lines
9. carousel.tsx             260 lines
10. OverlayGrid.tsx         237 lines

TOTAL: ~4,038 lines in top 10

TARGET (after refactor)
1. StemViewer.tsx            400 lines (-22%)
2. AudioProcessor.tsx        400 lines (-18%)
3. ArrangementDetector.tsx   400 lines (-19%)
4. TrackStudio.tsx          350 lines (-15%)
5. TrackList.tsx            300 lines (-23%)
6. StemVisualizer.tsx       200 lines (-24%)
7. sidebar.tsx (simplified)  150 lines (-78%)
8. [remove chart wrapper]      0 lines (-100%)
9. [remove carousel]           0 lines (-100%)
10. [remove OverlayGrid]       0 lines (-100%)

TOTAL: ~2,200 lines in top 7 (-45%)
```

---

## Migration Checklist

### Phase 1: Cleanup (Immediate)
- [ ] Remove 35 unused UI components
- [ ] Remove 24 unused dependencies
- [ ] Remove 4 unused page components
- [ ] Update imports across codebase
- [ ] Run tests to verify nothing breaks

### Phase 2: Consolidation (This Week)
- [ ] Merge layouts → single Layout
- [ ] Remove Toaster, keep Sonner
- [ ] Simplify sidebar (687 → 150 lines)
- [ ] Remove chart wrapper, use recharts directly
- [ ] Consolidate state management

### Phase 3: Modernization (Next Week)
- [ ] Install @wavesurfer/react
- [ ] Replace VolumeVisualizer with new API
- [ ] Install react-h5-audio-player
- [ ] Enhance StickyPlayer with new player
- [ ] Add Tone.js for audio features
- [ ] Migrate to hooks patterns

### Phase 4: Optimization (Following Week)
- [ ] Add lazy loading for routes
- [ ] Lazy load StemViewer (513 lines)
- [ ] Add bundle analysis
- [ ] Implement code splitting
- [ ] Performance testing

---

**End of Component Dependency Map**
