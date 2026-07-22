import { useState, useRef, useCallback, useEffect } from 'react'
import { Track, DeckState, MixerState, HotCue, ChefCue } from '../../types'

// ─────────────────────────────────────────────────
// Utility: cn (className merge)
// ─────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ─────────────────────────────────────────────────
// Default deck factory
// ─────────────────────────────────────────────────
function createDeck(id: DeckState['id']): DeckState {
  return {
    id,
    track: null,
    playing: false,
    position: 0,
    volume: 0.8,
    gain: 0,
    eq: { hi: 0, mid: 0, lo: 0 },
    stems: {
      vocals: { volume: 0.8, muted: false, solo: false, master: false },
      drums:  { volume: 0.8, muted: false, solo: false, master: false },
      bass:   { volume: 0.8, muted: false, solo: false, master: false },
      other:  { volume: 0.8, muted: false, solo: false, master: false },
    },
    hotCues: Array(8).fill(null),
    chefCues: [],
    chefLoading: false,
    bpm: 128,
    pitch: 0,
    loop: { active: false, start: 0, end: 0.5, size: 4 },
    syncEnabled: false,
  }
}

// ─────────────────────────────────────────────────
// Hot cue colors
// ─────────────────────────────────────────────────
const CUE_COLORS = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff5722']
const CUE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// ─────────────────────────────────────────────────
// Chef cue type colors
// ─────────────────────────────────────────────────
const CHEF_TYPE_COLORS: Record<ChefCue['type'], string> = {
  drop:   '#e74c3c',
  build:  '#f39c12',
  break:  '#3498db',
  intro:  '#2ecc71',
  outro:  '#9b59b6',
  verse:  '#00bcd4',
  chorus: '#e91e63',
}

// ─────────────────────────────────────────────────
// Knob component (drag up = increase)
// ─────────────────────────────────────────────────
interface KnobProps {
  label: string
  value: number       // -1.0 to 1.0
  onChange: (v: number) => void
  size?: number
  color?: string
}

function Knob({ label, value, onChange, size = 40, color = '#a78bfa' }: KnobProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - me.clientY) / 100
      const newVal = Math.max(-1, Math.min(1, dragRef.current.startVal + delta))
      onChange(newVal)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange])

  const handleDoubleClick = useCallback(() => {
    onChange(0)
  }, [onChange])

  const rotation = value * 135 // -135deg to +135deg

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div
        className="knob-container cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${(value * 100).toFixed(0)}% (drag up/down, dbl-click reset)`}
      >
        {/* Track ring */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          style={{ position: 'absolute', inset: 0 }}
        >
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="100.5 100.5"
            strokeDashoffset="0"
            strokeLinecap="round"
            style={{ transform: 'rotate(135deg)', transformOrigin: '20px 20px' }}
          />
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="100.5 100.5"
            strokeDashoffset={`${100.5 - (value + 1) / 2 * 75.4}`}
            strokeLinecap="round"
            style={{ transform: 'rotate(135deg)', transformOrigin: '20px 20px' }}
          />
        </svg>
        {/* Center */}
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            background: '#1e293b',
            border: '1px solid #475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Indicator dot */}
          <div
            style={{
              width: 3,
              height: 8,
              background: value === 0 ? '#64748b' : color,
              borderRadius: 1,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center bottom',
              position: 'absolute',
              bottom: '50%',
              left: '50%',
              marginLeft: -1.5,
            }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Fader component (drag up = increase)
// ─────────────────────────────────────────────────
interface FaderProps {
  label: string
  value: number       // 0.0 to 1.0
  onChange: (v: number) => void
  height?: number
  color?: string
}

function Fader({ label, value, onChange, height = 120, color = '#a78bfa' }: FaderProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - me.clientY) / height
      const newVal = Math.max(0, Math.min(1, dragRef.current.startVal + delta))
      onChange(newVal)
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange, height])

  const handleDoubleClick = useCallback(() => {
    onChange(0.8)
  }, [onChange])

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className="fader-container cursor-ns-resize"
        style={{ height, width: 20 }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${(value * 100).toFixed(0)}% (drag up/down, dbl-click reset)`}
      >
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#334155',
            borderRadius: 2,
          }}
        />
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value * 100}%`,
            background: color,
            borderRadius: 2,
            transition: 'none',
          }}
        />
        {/* Knob */}
        <div
          style={{
            position: 'absolute',
            bottom: `${value * 100}%`,
            left: -4,
            right: -4,
            height: 12,
            background: '#e2e8f0',
            borderRadius: 2,
            border: '1px solid #64748b',
            transform: 'translateY(-6px)',
          }}
        />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Waveform component
// ─────────────────────────────────────────────────
interface WaveformProps {
  data: number[]
  position: number
  height: number
  color?: string
}

function Waveform({ data, position, height, color = '#a78bfa' }: WaveformProps) {
  if (!data.length) return null

  const barWidth = 2
  const gap = 1
  const totalWidth = data.length * (barWidth + gap) - gap

  return (
    <div
      className="flex items-end gap-1 overflow-hidden"
      style={{ height, width: totalWidth }}
    >
      {data.map((amplitude, i) => {
        const isCurrent = Math.abs(i / data.length - position) < 0.005
        return (
          <div
            key={i}
            className="waveform-bar"
            style={{
              width: barWidth,
              height: `${Math.max(2, amplitude * height)}px`,
              background: isCurrent ? '#fbbf24' : color,
            }}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Deck component
// ─────────────────────────────────────────────────
interface DeckProps {
  deck: DeckState
  onUpdate: (updates: Partial<DeckState>) => void
  onLoadTrack: (track: Track) => void
  onChefGenerate: () => void
  onHotCueSet: (index: number) => void
  onHotCueJump: (index: number) => void
  onReprocess: () => void
}

function Deck({ deck, onUpdate, onLoadTrack, onChefGenerate, onHotCueSet, onHotCueJump, onReprocess }: DeckProps) {
  const [showDeckSelector, setShowDeckSelector] = useState(false)

  const handlePlayPause = useCallback(() => {
    onUpdate({ playing: !deck.playing })
  }, [deck.playing, onUpdate])

  const handlePositionChange = useCallback((pos: number) => {
    onUpdate({ position: pos })
  }, [onUpdate])

  const handleVolumeChange = useCallback((vol: number) => {
    onUpdate({ volume: vol })
  }, [onUpdate])

  const handleGainChange = useCallback((gain: number) => {
    onUpdate({ gain })
  }, [onUpdate])

  const handleEqChange = useCallback((eq: DeckState['eq']) => {
    onUpdate({ eq })
  }, [onUpdate])

  const handleStemChange = useCallback((stem: keyof DeckState['stems'], updates: Partial<DeckState['stems'][keyof DeckState['stems']]) => {
    onUpdate({
      stems: {
        ...deck.stems,
        [stem]: { ...deck.stems[stem], ...updates }
      }
    })
  }, [deck.stems, onUpdate])

  const handleBpmChange = useCallback((bpm: number) => {
    onUpdate({ bpm })
  }, [onUpdate])

  const handlePitchChange = useCallback((pitch: number) => {
    onUpdate({ pitch })
  }, [onUpdate])

  const handleSyncToggle = useCallback(() => {
    onUpdate({ syncEnabled: !deck.syncEnabled })
  }, [deck.syncEnabled, onUpdate])

  const handleTap = useCallback(() => {
    // Simple tap tempo - in real app would track timing
    const newBpm = Math.max(60, Math.min(200, deck.bpm + 1))
    onUpdate({ bpm: newBpm })
  }, [deck.bpm, onUpdate])

  const handleLearn = useCallback(() => {
    // Placeholder for MIDI learn
    console.log('MIDI learn for deck', deck.id)
  }, [deck.id])

  // Generate sample waveform data
  const waveformData = deck.track ? Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.2) : []

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header - Track title and transport controls inline */}
      <div className="flex items-center gap-3 p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex-1 min-w-0">
          {deck.track ? (
            <>
              <p className="text-sm font-medium text-gray-100 truncate">{deck.track.title}</p>
              <p className="text-xs text-gray-400 truncate">{deck.track.artist}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No track loaded</p>
          )}
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="w-8 h-8 rounded bg-purple-700 hover:bg-purple-600 text-white flex items-center justify-center text-sm font-bold"
            disabled={!deck.track}
          >
            {deck.playing ? '⏸' : '▶'}
          </button>
          <span className="text-xs text-gray-400 font-mono w-16 text-center">
            {deck.track ? `${Math.floor(deck.position * deck.track.duration / 60)}:${Math.floor((deck.position * deck.track.duration) % 60).toString().padStart(2, '0')}` : '0:00'}
          </span>
          <span className="text-xs text-gray-400 font-mono w-20 text-center">
            {deck.track ? `${Math.floor(deck.track.duration / 60)}:${Math.floor(deck.track.duration % 60).toString().padStart(2, '0')}` : '0:00:00'}
          </span>
          <button
            onClick={handleSyncToggle}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              deck.syncEnabled ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            )}
          >
            SYNC
          </button>
          <button
            onClick={handleLearn}
            className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-400 hover:bg-gray-600"
          >
            LEARN
          </button>
          <button
            onClick={handleTap}
            className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-400 hover:bg-gray-600"
          >
            TAP
          </button>
          <span className="text-xs text-gray-400 font-mono w-12 text-center">
            {deck.bpm.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Waveform */}
      {deck.track && (
        <div className="px-3 py-2 bg-gray-850">
          <div className="overflow-x-auto">
            <Waveform data={waveformData} position={deck.position} height={40} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-3 space-y-3">
        {/* EQ Knobs */}
        <div className="flex justify-center gap-6">
          <Knob
            label="HI"
            value={deck.eq.hi}
            onChange={(v) => handleEqChange({ ...deck.eq, hi: v })}
            color="#fbbf24"
          />
          <Knob
            label="MID"
            value={deck.eq.mid}
            onChange={(v) => handleEqChange({ ...deck.eq, mid: v })}
            color="#10b981"
          />
          <Knob
            label="LO"
            value={deck.eq.lo}
            onChange={(v) => handleEqChange({ ...deck.eq, lo: v })}
            color="#ef4444"
          />
        </div>

        {/* Gain and Volume faders */}
        <div className="flex justify-center gap-8">
          <Fader
            label="GAIN"
            value={(deck.gain + 1) / 2}
            onChange={(v) => handleGainChange(v * 2 - 1)}
            height={80}
            color="#f59e0b"
          />
          <Fader
            label="VOL"
            value={deck.volume}
            onChange={handleVolumeChange}
            height={80}
            color="#a78bfa"
          />
        </div>

        {/* Stem controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stems</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(deck.stems).map(([stem, controls]) => (
              <div key={stem} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12 capitalize">{stem}</span>
                <div className="flex-1 stem-bar bg-gray-700">
                  <div
                    className="stem-bar-fill bg-purple-500"
                    style={{ width: `${controls.volume * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => handleStemChange(stem as keyof DeckState['stems'], { muted: !controls.muted })}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    controls.muted ? "bg-red-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  M
                </button>
                <button
                  onClick={() => handleStemChange(stem as keyof DeckState['stems'], { solo: !controls.solo })}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    controls.solo ? "bg-yellow-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  S
                </button>
                <button
                  onClick={() => handleStemChange(stem as keyof DeckState['stems'], { master: !controls.master })}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    controls.master ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  MSTR
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Hot cues */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Hot Cues</h4>
          <div className="grid grid-cols-4 gap-1">
            {deck.hotCues.map((cue, i) => (
              <button
                key={i}
                onClick={() => cue ? onHotCueJump(i) : onHotCueSet(i)}
                className={cn(
                  "hot-cue-pad",
                  cue ? "text-white" : "text-gray-500 hover:text-gray-400",
                  cue && { backgroundColor: CUE_COLORS[i] }
                )}
                style={cue ? { backgroundColor: CUE_COLORS[i] } : {}}
              >
                {CUE_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Chef cues */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Chef Cues</h4>
            <button
              onClick={onChefGenerate}
              disabled={deck.chefLoading || !deck.track}
              className="px-2 py-1 rounded text-xs font-medium bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deck.chefLoading ? '...' : 'GENERATE'}
            </button>
          </div>
          {deck.chefCues.length === 0 ? (
            <p className="text-xs text-gray-500">No Chef cues · click GENERATE</p>
          ) : (
            <div className="flex gap-1 overflow-x-auto">
              {deck.chefCues.map((cue, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-2 h-6 rounded cursor-pointer"
                  style={{ backgroundColor: CHEF_TYPE_COLORS[cue.type] }}
                  title={`${cue.type} at ${(cue.position * 100).toFixed(1)}%`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reprocess button */}
        {deck.track && !deck.track.file_ok && (
          <button
            onClick={onReprocess}
            className="w-full py-2 rounded bg-orange-700 text-white hover:bg-orange-600 text-sm font-medium"
          >
            Reprocess Track
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main DJ Tab component
// ─────────────────────────────────────────────────
interface DJTabProps {
  tracks: Track[]
}

export default function DJTab({ tracks }: DJTabProps) {
  const [decks, setDecks] = useState<Record<string, DeckState>>({
    A: createDeck('A'),
    B: createDeck('B'),
    C: createDeck('C'),
    D: createDeck('D'),
  })

  const [mixer, setMixer] = useState<MixerState>({
    crossfader: 0.5,
    masterVolume: 0.8,
    masterBpm: 128,
    metronomeActive: false,
    metronomeBpm: 128,
    activeDeckPair: 'AB',
  })

  const [midiEvents, setMidiEvents] = useState<string[]>([])

  // Update deck
  const updateDeck = useCallback((deckId: string, updates: Partial<DeckState>) => {
    setDecks(prev => ({
      ...prev,
      [deckId]: { ...prev[deckId], ...updates }
    }))
  }, [])

  // Load track into deck
  const loadTrackIntoDeck = useCallback((deckId: string, track: Track) => {
    updateDeck(deckId, {
      track,
      position: 0,
      playing: false,
      bpm: track.bpm || 128,
      hotCues: Array(8).fill(null),
      chefCues: [],
    })
  }, [updateDeck])

  // Chef generate handler
  const handleChefGenerate = useCallback((deckId: string) => {
    updateDeck(deckId, { chefLoading: true })

    // Simulate AI processing
    setTimeout(() => {
      const sampleCues: ChefCue[] = [
        { label: 'Intro', position: 0.02, type: 'intro', confidence: 0.9 },
        { label: 'Drop', position: 0.15, type: 'drop', confidence: 0.95 },
        { label: 'Build', position: 0.35, type: 'build', confidence: 0.8 },
        { label: 'Break', position: 0.55, type: 'break', confidence: 0.85 },
        { label: 'Chorus', position: 0.7, type: 'chorus', confidence: 0.9 },
        { label: 'Outro', position: 0.9, type: 'outro', confidence: 0.75 },
      ]
      updateDeck(deckId, { chefCues: sampleCues, chefLoading: false })
    }, 2000)
  }, [updateDeck])

  // Hot cue handlers
  const handleHotCueSet = useCallback((deckId: string, index: number) => {
    const deck = decks[deckId]
    if (!deck.track) return

    const cue: HotCue = {
      label: CUE_LABELS[index],
      position: deck.position,
      color: CUE_COLORS[index],
    }

    const newCues = [...deck.hotCues]
    newCues[index] = cue

    updateDeck(deckId, { hotCues: newCues })
  }, [decks, updateDeck])

  const handleHotCueJump = useCallback((deckId: string, index: number) => {
    const deck = decks[deckId]
    const cue = deck.hotCues[index]
    if (cue) {
      updateDeck(deckId, { position: cue.position })
    }
  }, [decks, updateDeck])

  // Reprocess handler
  const handleReprocess = useCallback((deckId: string) => {
    console.log('Reprocessing track for deck', deckId)
    // In real app, this would trigger background job
  }, [])

  // Metronome handler
  const handleMetronomeToggle = useCallback(() => {
    setMixer(prev => ({ ...prev, metronomeActive: !prev.metronomeActive }))
  }, [])

  // Crossfader handler
  const handleCrossfaderChange = useCallback((value: number) => {
    setMixer(prev => ({ ...prev, crossfader: value }))
  }, [])

  // Master volume handler
  const handleMasterVolumeChange = useCallback((value: number) => {
    setMixer(prev => ({ ...prev, masterVolume: value }))
  }, [])

  // Deck pair selector
  const activeDecks = mixer.activeDeckPair === 'AB' ? ['A', 'B'] : ['C', 'D']

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Decks */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {activeDecks.map(deckId => (
          <div key={deckId} className="flex-1 min-w-0">
            <Deck
              deck={decks[deckId]}
              onUpdate={(updates) => updateDeck(deckId, updates)}
              onLoadTrack={(track) => loadTrackIntoDeck(deckId, track)}
              onChefGenerate={() => handleChefGenerate(deckId)}
              onHotCueSet={(index) => handleHotCueSet(deckId, index)}
              onHotCueJump={(index) => handleHotCueJump(deckId, index)}
              onReprocess={() => handleReprocess(deckId)}
            />
          </div>
        ))}
      </div>

      {/* Center mixer section */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-8">
          {/* Deck selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">DECKS</span>
            <div className="flex gap-1">
              {['AB', 'CD'].map(pair => (
                <button
                  key={pair}
                  onClick={() => setMixer(prev => ({ ...prev, activeDeckPair: pair as 'AB' | 'CD' }))}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    mixer.activeDeckPair === pair ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  )}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>

          {/* Crossfader */}
          <div className="flex flex-col items-center gap-2">
            <Fader
              label="CROSSFADER"
              value={mixer.crossfader}
              onChange={handleCrossfaderChange}
              height={60}
              color="#06b6d4"
            />
          </div>

          {/* Master volume */}
          <div className="flex flex-col items-center gap-2">
            <Fader
              label="MASTER"
              value={mixer.masterVolume}
              onChange={handleMasterVolumeChange}
              height={60}
              color="#10b981"
            />
          </div>

          {/* Metronome */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleMetronomeToggle}
              className={cn(
                "px-3 py-2 rounded text-sm font-medium",
                mixer.metronomeActive ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              )}
            >
              METRONOME
            </button>
            <span className="text-xs text-gray-400">{mixer.metronomeBpm} BPM</span>
          </div>
        </div>
      </div>

      {/* MIDI footer */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>MIDI —</span>
          <span>| {midiEvents.length > 0 ? midiEvents.slice(-1)[0] : 'no events yet'} |</span>
          <span>IN | OUT | OFF</span>
        </div>
      </div>
    </div>
  )
}