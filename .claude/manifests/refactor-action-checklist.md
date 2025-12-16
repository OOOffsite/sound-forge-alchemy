# Frontend Refactor Action Checklist

**Project**: Sound Forge Alchemy → Alchemy2
**Date Created**: 2025-12-16
**Estimated Time**: 22 hours total
**Expected Impact**: -52% bundle size, -62% components, -50% code

---

## 📋 Phase 1: Cleanup (4 hours) - START HERE

**Priority**: 🔥 CRITICAL
**Risk**: ✅ LOW
**Impact**: 🚀 HIGH (-40% bundle immediately)

### Step 1.1: Remove Unused Dependencies (1 hour)

```bash
# Remove calendar dependencies (260kb)
npm uninstall date-fns react-day-picker

# Remove carousel (35kb)
npm uninstall embla-carousel-react

# Remove drag-and-drop (57kb)
npm uninstall @dnd-kit/core @dnd-kit/utilities

# Remove panels/draggable (65kb)
npm uninstall react-resizable-panels react-draggable

# Remove command/drawer/otp (95kb)
npm uninstall cmdk vaul input-otp

# Remove unused Radix UI (~230kb)
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-separator
```

**Verification**:
- [ ] Run `npm install` successfully
- [ ] Run `npm run build` - should succeed
- [ ] Check bundle size reduced
- [ ] node_modules size reduced (~170MB savings)

---

### Step 1.2: Remove Unused UI Components (2 hours)

```bash
cd src/components/ui

# Remove these 35 files
rm -f accordion.tsx
rm -f alert-dialog.tsx
rm -f alert.tsx
rm -f aspect-ratio.tsx
rm -f avatar.tsx
rm -f badge.tsx
rm -f breadcrumb.tsx
rm -f calendar.tsx
rm -f carousel.tsx
rm -f checkbox.tsx
rm -f collapsible.tsx
rm -f command.tsx
rm -f context-menu.tsx
rm -f drawer.tsx
rm -f form.tsx
rm -f hover-card.tsx
rm -f input-otp.tsx
rm -f menubar.tsx
rm -f navigation-menu.tsx
rm -f pagination.tsx
rm -f popover.tsx
rm -f progress.tsx
rm -f radio-group.tsx
rm -f resizable.tsx
rm -f scroll-area.tsx
rm -f separator.tsx
rm -f sheet.tsx
rm -f sidebar.tsx  # Will recreate simplified version
rm -f skeleton.tsx
rm -f table.tsx
rm -f tabs.tsx
rm -f textarea.tsx
rm -f toggle-group.tsx

# Also remove chart wrapper (will use recharts directly)
rm -f chart.tsx
```

**Verification**:
- [ ] No import errors in remaining files
- [ ] Run `npm run lint` - fix any issues
- [ ] Run `npm run build` successfully
- [ ] 35 components removed

---

### Step 1.3: Remove Unused Pages (30 min)

```bash
cd src/components

# Remove unused page components
rm -rf Dashboard/
rm -rf TrackLibrary/
rm -rf SearchPage/
rm -rf ErrorPage/
```

**Update routes.tsx**:
```typescript
// Remove these imports
import Dashboard from './components/Dashboard/Dashboard';
import TrackLibrary from './components/TrackLibrary/TrackLibrary';
import SearchPage from './components/SearchPage/SearchPage';
import ErrorPage from './components/ErrorPage/ErrorPage';

// Keep only active routes
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: '/alchemy/session', element: <Index /> },
      { path: '/about', element: <About /> },
      { path: '*', element: <NotFound /> }
    ]
  }
];
```

**Verification**:
- [ ] Routes still work
- [ ] No 404 errors on navigation
- [ ] Build succeeds

---

### Step 1.4: Clean Up Imports (30 min)

```bash
# Find and remove unused imports
grep -r "from.*components/ui/accordion" src/ --include="*.tsx"
grep -r "from.*components/ui/calendar" src/ --include="*.tsx"
grep -r "from.*date-fns" src/ --include="*.tsx"
# ... etc for all removed components

# Use your editor's organize imports feature
# or run:
npx eslint src --fix
```

**Verification**:
- [ ] No import errors
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes

---

### ✅ Phase 1 Complete Checklist
- [ ] 24 dependencies removed (~500kb)
- [ ] 35 UI components removed
- [ ] 4 page components removed
- [ ] All imports cleaned up
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Git commit: "refactor(cleanup): remove unused dependencies and components"

**Expected Result**: Bundle size reduced by ~40%, cleaner codebase

---

## 📋 Phase 2: Consolidation (6 hours)

**Priority**: 🔥 HIGH
**Risk**: ⚠️ MEDIUM (requires refactoring)
**Impact**: 🚀 MEDIUM (-30% complexity)

### Step 2.1: Consolidate Notification Systems (1 hour)

**Remove Toaster, keep Sonner only**

```typescript
// src/App.tsx - BEFORE
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";

<Toaster />  // ← REMOVE
<Sonner />   // ← KEEP

// AFTER
import { Toaster } from "./components/ui/sonner";

<Toaster />  // Just Sonner
```

**Find and replace all toast usage**:
```bash
# Find all Toaster usage
grep -r "import.*Toaster.*from.*toaster" src/

# Replace with Sonner
# src/components/ui/toaster.tsx - DELETE FILE
# Update all imports to use sonner
```

**Verification**:
- [ ] Remove `src/components/ui/toaster.tsx`
- [ ] Remove `src/components/ui/toast.tsx`
- [ ] Update imports to use sonner
- [ ] Test notifications work
- [ ] Git commit: "refactor(notifications): consolidate to Sonner only"

---

### Step 2.2: Consolidate Layout Components (2 hours)

**Merge AppLayout, MainLayout → Layout**

```typescript
// src/layouts/Layout.tsx - NEW UNIFIED VERSION
import React from 'react';
import StickyPlayer from '../components/ui/StickyPlayer';

interface LayoutProps {
  children: React.ReactNode;
  currentTrack?: {
    title: string;
    artist: string;
    albumArt?: string;
    duration: string;
    audioUrl?: string;
  };
  isProcessing?: boolean;
  isWorkingWithStems?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentTrack,
  isProcessing = false,
  isWorkingWithStems = false
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="pb-24">
        {children}
      </main>

      {/* Sticky player at bottom */}
      {currentTrack && (
        <StickyPlayer
          track={currentTrack}
          isProcessing={isProcessing}
          isWorkingWithStems={isWorkingWithStems}
        />
      )}
    </div>
  );
};

export default Layout;
```

**Remove old layouts**:
```bash
rm src/components/AppLayout.tsx
rm src/components/Layout/Layout.tsx
rm src/layouts/MainLayout.tsx
```

**Update imports**:
```typescript
// Update all files that import layouts
import Layout from '../layouts/Layout';
```

**Verification**:
- [ ] All pages use new Layout
- [ ] StickyPlayer still works
- [ ] Navigation works
- [ ] Build succeeds
- [ ] Git commit: "refactor(layout): consolidate to single Layout component"

---

### Step 2.3: Simplify Sidebar (2 hours)

**Create simplified sidebar (687 → 150 lines)**

```typescript
// src/components/ui/sidebar.tsx - SIMPLIFIED VERSION
import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '../../lib/utils';

interface SidebarProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  children,
  defaultOpen = true,
  className
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "transition-all duration-300",
        open ? "w-64" : "w-16",
        className
      )}
    >
      <div className="h-full border-r border-border bg-background">
        {children}
      </div>
    </Collapsible.Root>
  );
};

// Simple subcomponents
const SidebarHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 border-b border-border">{children}</div>
);

const SidebarContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4">{children}</div>
);

export { Sidebar, SidebarHeader, SidebarContent };
```

**Install dependency** (if not already installed):
```bash
npm install @radix-ui/react-collapsible
```

**Update sidebar usage**:
```typescript
import { Sidebar, SidebarHeader, SidebarContent } from './components/ui/sidebar';

<Sidebar defaultOpen={true}>
  <SidebarHeader>
    <h2>Navigation</h2>
  </SidebarHeader>
  <SidebarContent>
    {/* Sidebar content */}
  </SidebarContent>
</Sidebar>
```

**Verification**:
- [ ] Sidebar works with collapse/expand
- [ ] Responsive behavior works
- [ ] ~537 lines removed (687 → 150)
- [ ] Git commit: "refactor(sidebar): simplify from 687 to 150 lines"

---

### Step 2.4: Remove Chart Wrapper (1 hour)

**Use recharts directly instead of wrapper**

```bash
# Remove chart wrapper
rm src/components/ui/chart.tsx
```

**Update chart usage**:
```typescript
// BEFORE (using wrapper)
import { ChartContainer } from './components/ui/chart';
<ChartContainer config={config}>
  <LineChart data={data}>...</LineChart>
</ChartContainer>

// AFTER (direct recharts)
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
<LineChart data={data} width={400} height={300}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="value" stroke="#8884d8" />
</LineChart>
```

**Verification**:
- [ ] Charts still render correctly
- [ ] Theme support maintained (via CSS)
- [ ] ~363 lines removed
- [ ] Git commit: "refactor(charts): remove wrapper, use recharts directly"

---

### ✅ Phase 2 Complete Checklist
- [ ] Single notification system (Sonner)
- [ ] Single layout component
- [ ] Simplified sidebar (687 → 150 lines)
- [ ] Removed chart wrapper (363 lines)
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Git commit: "refactor(consolidation): simplify architecture"

**Expected Result**: -30% complexity, clearer architecture

---

## 📋 Phase 3: Modernization (8 hours)

**Priority**: ⚠️ MEDIUM
**Risk**: ⚠️ MEDIUM (new libraries)
**Impact**: 🚀 HIGH (better DX, professional audio)

### Step 3.1: Install New Dependencies (15 min)

```bash
# Install new audio libraries
npm install @wavesurfer/react
npm install react-h5-audio-player
npm install tone
npm install nanoid
```

**Verification**:
- [ ] All packages install successfully
- [ ] No peer dependency warnings
- [ ] Build still succeeds

---

### Step 3.2: Replace WaveSurfer Wrapper (2 hours)

**Update VolumeVisualizer with @wavesurfer/react**

```typescript
// src/components/ui/VolumeVisualizer.tsx - NEW VERSION
import React from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { useTheme } from '../../hooks/use-theme';

interface VolumeVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  playing: boolean;
  volume: number;
  width?: number;
  height?: number;
}

const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  audioRef,
  playing,
  volume,
  width = 100,
  height = 20,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: height,
    waveColor: theme === 'dark' ? '#8a94a8' : '#d1d5db',
    progressColor: theme === 'dark' ? '#60a5fa' : '#3b82f6',
    barWidth: 2,
    barGap: 1,
    barRadius: 1,
    normalize: true,
  });

  // Connect to audio element
  React.useEffect(() => {
    if (wavesurfer && audioRef.current) {
      wavesurfer.load(audioRef.current.src);
    }
  }, [wavesurfer, audioRef]);

  // Sync playback
  React.useEffect(() => {
    if (!wavesurfer) return;

    if (playing) {
      wavesurfer.play();
    } else {
      wavesurfer.pause();
    }
  }, [wavesurfer, playing]);

  // Update volume
  React.useEffect(() => {
    if (wavesurfer) {
      wavesurfer.setVolume(volume);
    }
  }, [wavesurfer, volume]);

  return <div ref={containerRef} style={{ width: `${width}px` }} />;
};

export default VolumeVisualizer;
```

**Update StemViewer with @wavesurfer/react**:
```typescript
// Similar pattern for StemViewer.tsx
import { useWavesurfer } from '@wavesurfer/react';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';

// Use hooks instead of imperative API
const { wavesurfer } = useWavesurfer({
  container: containerRef,
  plugins: [RegionsPlugin.create()],
  // ... config
});
```

**Verification**:
- [ ] VolumeVisualizer works with new API
- [ ] StemViewer waveforms render correctly
- [ ] Playback sync works
- [ ] Code reduced from ~160 to ~80 lines
- [ ] Git commit: "refactor(audio): migrate to @wavesurfer/react hooks"

---

### Step 3.3: Enhance StickyPlayer (3 hours)

**Replace custom player with react-h5-audio-player**

```typescript
// src/components/ui/StickyPlayer.tsx - ENHANCED VERSION
import React from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import VolumeVisualizer from './VolumeVisualizer';
import { cn } from '../../lib/utils';

interface StickyPlayerProps {
  track?: {
    title: string;
    artist: string;
    albumArt?: string;
    duration: string;
    audioUrl?: string;
  };
  isProcessing: boolean;
  isWorkingWithStems: boolean;
}

const StickyPlayer: React.FC<StickyPlayerProps> = ({
  track,
  isProcessing,
  isWorkingWithStems
}) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.8);

  if (!track?.audioUrl) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-background border-t border-border shadow-lg"
    )}>
      <div className="flex items-center gap-4 p-4">
        {/* Album art */}
        {track.albumArt && (
          <img
            src={track.albumArt}
            alt="Album Art"
            className="w-16 h-16 rounded"
          />
        )}

        {/* Track info */}
        <div className="min-w-0 flex-shrink-0">
          <div className="font-semibold truncate">{track.title}</div>
          <div className="text-sm text-muted-foreground truncate">
            {track.artist}
          </div>
        </div>

        {/* Audio player */}
        <div className="flex-1">
          <AudioPlayer
            ref={audioRef}
            src={track.audioUrl}
            autoPlay={false}
            volume={volume}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onVolumeChange={(e) => setVolume(e.currentTarget.volume)}
            showJumpControls={true}
            customProgressBarSection={[
              'CURRENT_TIME',
              'PROGRESS_BAR',
              'DURATION',
            ]}
            customControlsSection={[
              'MAIN_CONTROLS',
              'VOLUME_CONTROLS',
            ]}
            className="shadow-none"
          />
        </div>

        {/* Volume visualizer */}
        <VolumeVisualizer
          audioRef={audioRef}
          playing={playing}
          volume={volume}
          width={100}
          height={40}
        />
      </div>
    </div>
  );
};

export default StickyPlayer;
```

**Add custom styling**:
```css
/* src/styles/audio-player.css */
.rhap_container {
  background-color: transparent !important;
  box-shadow: none !important;
}

.rhap_main-controls-button {
  color: var(--foreground) !important;
}

.rhap_progress-filled {
  background-color: var(--primary) !important;
}
```

**Verification**:
- [ ] Player renders correctly
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Waveform syncs with playback
- [ ] Keyboard shortcuts work
- [ ] Git commit: "refactor(player): enhance with react-h5-audio-player"

---

### Step 3.4: Add Tone.js for Audio Features (2 hours)

**Create audio utilities with Tone.js**

```typescript
// src/lib/audio/toneUtils.ts - NEW FILE
import * as Tone from 'tone';

export class AudioEngine {
  private players: Map<string, Tone.Player>;
  private volumes: Map<string, Tone.Volume>;

  constructor() {
    this.players = new Map();
    this.volumes = new Map();
  }

  async loadStem(id: string, url: string) {
    const volume = new Tone.Volume(-10).toDestination();
    const player = new Tone.Player(url).connect(volume);

    await player.load();

    this.players.set(id, player);
    this.volumes.set(id, volume);
  }

  play(id: string) {
    this.players.get(id)?.start();
  }

  pause(id: string) {
    this.players.get(id)?.stop();
  }

  setVolume(id: string, db: number) {
    this.volumes.get(id)?.set({ volume: db });
  }

  mute(id: string) {
    this.volumes.get(id)?.mute = true;
  }

  unmute(id: string) {
    this.volumes.get(id)?.mute = false;
  }

  dispose() {
    this.players.forEach(player => player.dispose());
    this.volumes.forEach(volume => volume.dispose());
  }
}

export const audioEngine = new AudioEngine();
```

**Use in StemViewer**:
```typescript
// Update StemViewer to use Tone.js
import { audioEngine } from '../../lib/audio/toneUtils';

// Load stems
useEffect(() => {
  stems.forEach(stem => {
    audioEngine.loadStem(stem.id, stem.url);
  });

  return () => audioEngine.dispose();
}, [stems]);

// Playback controls
const togglePlayPause = () => {
  stems.forEach(stem => {
    if (playing) {
      audioEngine.pause(stem.id);
    } else {
      audioEngine.play(stem.id);
    }
  });
  setPlaying(!playing);
};
```

**Verification**:
- [ ] Tone.js initializes correctly
- [ ] Stem playback works
- [ ] Volume control works
- [ ] Better sync between stems
- [ ] Git commit: "feat(audio): add Tone.js for professional audio handling"

---

### Step 3.5: Migrate to Modern Patterns (45 min)

**Use nanoid for IDs**:
```typescript
// BEFORE
const newId = `stem-${Date.now()}`;

// AFTER
import { nanoid } from 'nanoid';
const newId = `stem-${nanoid(10)}`;
```

**Extract audio hooks**:
```typescript
// src/hooks/useAudioPlayback.ts - NEW FILE
import { useState, useEffect } from 'react';
import { audioEngine } from '../lib/audio/toneUtils';

export const useAudioPlayback = (stems: Stem[]) => {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    stems.forEach(stem => {
      audioEngine.loadStem(stem.id, stem.url);
    });

    return () => audioEngine.dispose();
  }, [stems]);

  const togglePlay = () => {
    stems.forEach(stem => {
      playing ? audioEngine.pause(stem.id) : audioEngine.play(stem.id);
    });
    setPlaying(!playing);
  };

  return { playing, togglePlay };
};
```

**Verification**:
- [ ] IDs are unique and secure
- [ ] Audio hooks work correctly
- [ ] Code is more maintainable
- [ ] Git commit: "refactor(patterns): migrate to modern React patterns"

---

### ✅ Phase 3 Complete Checklist
- [ ] @wavesurfer/react integrated
- [ ] react-h5-audio-player integrated
- [ ] Tone.js added for audio
- [ ] Modern patterns adopted
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Git commit: "refactor(modernization): upgrade audio stack"

**Expected Result**: Professional audio handling, better DX

---

## 📋 Phase 4: Optimization (4 hours)

**Priority**: ⚠️ LOW
**Risk**: ✅ LOW
**Impact**: 🚀 MEDIUM (performance gains)

### Step 4.1: Add Code Splitting (2 hours)

**Lazy load routes**:
```typescript
// src/routes.tsx
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Index = lazy(() => import('./pages/Index'));
const About = lazy(() => import('./pages/About'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <Layout />
      </Suspense>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: '/alchemy/session', element: <Index /> },
      { path: '/about', element: <About /> },
    ]
  }
];
```

**Lazy load heavy components**:
```typescript
// src/pages/Index.tsx
import { lazy } from 'react';

const StemViewer = lazy(() => import('../components/StemViewer/StemViewer'));
const AudioProcessor = lazy(() => import('../components/AudioProcessor'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <StemViewer {...props} />
</Suspense>
```

**Verification**:
- [ ] Routes lazy load correctly
- [ ] Loading states show
- [ ] Bundle splits into chunks
- [ ] Git commit: "perf(splitting): add lazy loading for routes and components"

---

### Step 4.2: Bundle Analysis (1 hour)

**Generate bundle analysis**:
```bash
# Build and analyze
npm run build
npx vite-bundle-visualizer --template treemap --open true

# Save report
npx vite-bundle-visualizer --template raw-data --output bundle-analysis.json
```

**Review and optimize**:
- [ ] Identify large chunks
- [ ] Check for duplicate dependencies
- [ ] Verify tree-shaking works
- [ ] Document bundle sizes

---

### Step 4.3: Performance Testing (1 hour)

**Add Lighthouse CI**:
```bash
npm install -D @lhci/cli

# Run Lighthouse
npx lhci autorun --collect.url=http://localhost:5173
```

**Measure key metrics**:
- [ ] First Contentful Paint (FCP)
- [ ] Largest Contentful Paint (LCP)
- [ ] Time to Interactive (TTI)
- [ ] Bundle size
- [ ] Document baseline metrics

**Verification**:
- [ ] Lighthouse score > 90
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] Bundle < 1.5MB
- [ ] Git commit: "perf(metrics): add performance testing"

---

### ✅ Phase 4 Complete Checklist
- [ ] Code splitting implemented
- [ ] Bundle analyzed
- [ ] Performance measured
- [ ] Baseline documented
- [ ] Git commit: "perf(optimization): complete performance optimization"

**Expected Result**: Faster load times, better performance scores

---

## 🎯 Final Verification

### Build Check
```bash
npm run lint
npm run build
npm run test
npm run preview
```

### Bundle Size Check
```bash
# Before: ~2.5MB
# After: ~1.2MB
# Reduction: -52%

du -sh dist/
npx vite-bundle-visualizer
```

### Component Count Check
```bash
# Before: 93 components
# After: 35 components
# Reduction: -62%

find src/components -name "*.tsx" | wc -l
```

### Dependency Check
```bash
# Before: 58 dependencies
# After: 38 dependencies
# Reduction: -34%

npm ls --depth=0 | grep -E "^[├└]" | wc -l
```

---

## 📊 Success Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Components** | 93 | 35 | -62% ✅ |
| **Dependencies** | 58 | 38 | -34% ✅ |
| **Bundle Size** | 2.5MB | 1.2MB | -52% ✅ |
| **node_modules** | 420MB | 250MB | -40% ✅ |
| **Lines of Code** | 9,000 | 4,500 | -50% ✅ |
| **Lighthouse** | ? | >90 | ⬆️ ✅ |

---

## 🚀 Deployment

### Create PR
```bash
git checkout -b refactor/frontend-optimization
git add .
git commit -m "refactor: optimize frontend architecture (-52% bundle, -62% components)"
git push origin refactor/frontend-optimization

# Create PR with:
# - Link to this checklist
# - Before/after metrics
# - Bundle size screenshots
```

### Testing Checklist
- [ ] All audio features work
- [ ] Stem separation works
- [ ] MIDI integration works
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance improved

---

## 📝 Notes for Alchemy2

### What Worked Well
- Minimal dependencies from start
- Clear component hierarchy
- Good separation of concerns
- Professional audio libraries

### What to Avoid
- Installing entire UI libraries
- Heavy unused dependencies
- Over-engineered wrappers
- Duplicate systems

### Recommended Stack
```json
{
  "ui": "Radix UI (selective)",
  "audio": ["@wavesurfer/react", "tone", "react-h5-audio-player"],
  "state": ["zustand", "@tanstack/react-query"],
  "forms": ["react-hook-form", "zod"],
  "styling": ["tailwindcss"],
  "utils": ["nanoid", "clsx", "tailwind-merge"]
}
```

---

**End of Checklist** ✅

Total Time: ~22 hours
Impact: -52% bundle, -62% components, better architecture
