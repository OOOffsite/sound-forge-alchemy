import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ArrangementSection } from '../StemViewer/StemViewer';

interface ArrangementDetectorProps {
  trackId: string;
  audioUrl: string;
  bpm: number;
  duration: number;
  onArrangementDetected?: (arrangement: ArrangementSection[]) => void;
  onSaveArrangementTemplate?: (name: string, arrangement: ArrangementSection[]) => void;
}

const sectionColors = {
  intro: '#4464AD',
  verse: '#53B175',
  chorus: '#FF5E5B',
  bridge: '#7E6551',
  outro: '#D1B1CB',
  custom: '#808080'
};

// Reusable component for rendering arrangement sections
const ArrangementSectionItem = ({ section, onEdit }: { section: ArrangementSection; onEdit: (section: ArrangementSection) => void }) => (
  <div 
    key={section.id}
    className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
  >
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: section.color }}
      />
      <span>{section.label}</span>
      <Badge variant="outline">
        {section.type}
      </Badge>
    </div>
    <div className="text-sm text-muted-foreground">
      {formatTime(section.start)} - {formatTime(section.end)}
    </div>
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => onEdit(section)}
    >
      Edit
    </Button>
  </div>
);

const ArrangementDetector: React.FC<ArrangementDetectorProps> = ({
  trackId,
  audioUrl,
  bpm,
  duration,
  onArrangementDetected,
  onSaveArrangementTemplate
}) => {
  const [arrangement, setArrangement] = useState<ArrangementSection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedSection, setSelectedSection] = useState<ArrangementSection | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState<ArrangementSection['type']>('custom');

  // Function to run arrangement detection
  const detectArrangement = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Simulating progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          const newProgress = prev + 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);
      
      // Call the analysis API
      const response = await fetch(`/api/analysis/arrangement?trackId=${trackId}`);
      const data: { arrangement: { start: number; end: number; type: string; label?: string }[] } = await response.json();
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      // Process detected arrangement
      if (data.arrangement) {
        const processedArrangement = data.arrangement.map((section, index) => ({
          id: `section-${index}`,
          start: section.start,
          end: section.end,
          type: section.type as ArrangementSection['type'],
          color: sectionColors[section.type as keyof typeof sectionColors] || sectionColors.custom,
          label: section.label || getDefaultLabel(section.type, index)
        }));
        
        setArrangement(processedArrangement);
        
        // Call the callback if provided
        if (onArrangementDetected) {
          onArrangementDetected(processedArrangement);
        }
      }
    } catch (error) {
      console.error('Error detecting arrangement:', error);
      
      // Fallback to a basic arrangement if detection fails
      const fallbackArrangement = generateFallbackArrangement();
      setArrangement(fallbackArrangement);
      
      if (onArrangementDetected) {
        onArrangementDetected(fallbackArrangement);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // Generate a fallback arrangement based on typical structures and BPM
  const generateFallbackArrangement = (): ArrangementSection[] => {
    // Calculate section durations based on BPM
    const barDuration = 60 / bpm * 4; // Duration of one bar in seconds
    const introLength = 8 * barDuration; // 8 bars intro
    const verseLength = 16 * barDuration; // 16 bars verse
    const chorusLength = 8 * barDuration; // 8 bars chorus
    const bridgeLength = 8 * barDuration; // 8 bars bridge
    const outroLength = 8 * barDuration; // 8 bars outro
    
    // Create sections
    let currentTime = 0;
    const sections: ArrangementSection[] = [];
    
    // Add intro
    sections.push({
      id: 'section-0',
      start: currentTime,
      end: currentTime + introLength,
      type: 'intro',
      color: sectionColors.intro,
      label: 'Intro'
    });
    currentTime += introLength;
    
    // Add verse
    sections.push({
      id: 'section-1',
      start: currentTime,
      end: currentTime + verseLength,
      type: 'verse',
      color: sectionColors.verse,
      label: 'Verse 1'
    });
    currentTime += verseLength;
    
    // Add chorus
    sections.push({
      id: 'section-2',
      start: currentTime,
      end: currentTime + chorusLength,
      type: 'chorus',
      color: sectionColors.chorus,
      label: 'Chorus 1'
    });
    currentTime += chorusLength;
    
    // Add verse 2
    sections.push({
      id: 'section-3',
      start: currentTime,
      end: currentTime + verseLength,
      type: 'verse',
      color: sectionColors.verse,
      label: 'Verse 2'
    });
    currentTime += verseLength;
    
    // Add chorus 2
    sections.push({
      id: 'section-4',
      start: currentTime,
      end: currentTime + chorusLength,
      type: 'chorus',
      color: sectionColors.chorus,
      label: 'Chorus 2'
    });
    currentTime += chorusLength;
    
    // Add bridge
    sections.push({
      id: 'section-5',
      start: currentTime,
      end: currentTime + bridgeLength,
      type: 'bridge',
      color: sectionColors.bridge,
      label: 'Bridge'
    });
    currentTime += bridgeLength;
    
    // Add final chorus
    sections.push({
      id: 'section-6',
      start: currentTime,
      end: currentTime + chorusLength,
      type: 'chorus',
      color: sectionColors.chorus,
      label: 'Chorus 3'
    });
    currentTime += chorusLength;
    
    // Add outro
    if (currentTime < duration) {
      sections.push({
        id: 'section-7',
        start: currentTime,
        end: Math.min(currentTime + outroLength, duration),
        type: 'outro',
        color: sectionColors.outro,
        label: 'Outro'
      });
    }
    
    return sections;
  };

  // Get default label for a section type
  const getDefaultLabel = (type: string, index: number): string => {
    const typeCount = arrangement.filter(section => section.type === type).length;
    
    switch (type) {
      case 'intro':
        return 'Intro';
      case 'verse':
        return `Verse ${typeCount + 1}`;
      case 'chorus':
        return `Chorus ${typeCount + 1}`;
      case 'bridge':
        return typeCount > 0 ? `Bridge ${typeCount + 1}` : 'Bridge';
      case 'outro':
        return 'Outro';
      default:
        return `Section ${index + 1}`;
    }
  };

  // Handle saving arrangement as template
  const saveAsTemplate = () => {
    if (templateName.trim() && arrangement.length > 0 && onSaveArrangementTemplate) {
      onSaveArrangementTemplate(templateName, arrangement);
      setTemplateName('');
    }
  };

  // Open edit dialog for a section
  const editSection = (section: ArrangementSection) => {
    setSelectedSection(section);
    setCustomLabel(section.label);
    setCustomType(section.type);
    setEditDialogOpen(true);
  };

  // Save section edits
  const saveEdits = () => {
    if (selectedSection && customLabel) {
      const updatedArrangement = arrangement.map(section => 
        section.id === selectedSection.id
          ? {
              ...section,
              label: customLabel,
              type: customType,
              color: sectionColors[customType]
            }
          : section
      );
      
      setArrangement(updatedArrangement);
      
      if (onArrangementDetected) {
        onArrangementDetected(updatedArrangement);
      }
      
      setEditDialogOpen(false);
    }
  };

  // Add a custom section
  const addCustomSection = () => {
    // Find a suitable spot (gap) in the arrangement
    let startTime = 0;
    const sortedSections = [...arrangement].sort((a, b) => a.start - b.start);
    
    // Find the first gap or use the end of the track
    for (let i = 0; i < sortedSections.length; i++) {
      if (i === 0 && sortedSections[i].start > 0) {
        // Gap at the beginning
        startTime = 0;
        break;
      } else if (i < sortedSections.length - 1) {
        // Check for gap between sections
        const current = sortedSections[i];
        const next = sortedSections[i + 1];
        if (current.end < next.start) {
          startTime = current.end;
          break;
        }
      } else {
        // No gaps found, use the end of the last section
        startTime = sortedSections[i].end;
      }
    }
    
    // Create the new section
    const endTime = Math.min(startTime + 8 * (60 / bpm * 4), duration);
    const newSection: ArrangementSection = {
      id: `section-${Date.now()}`,
      start: startTime,
      end: endTime,
      type: 'custom',
      color: sectionColors.custom,
      label: `Custom Section ${arrangement.filter(s => s.type === 'custom').length + 1}`
    };
    
    const newArrangement = [...arrangement, newSection];
    setArrangement(newArrangement);
    
    if (onArrangementDetected) {
      onArrangementDetected(newArrangement);
    }
    
    // Open edit dialog for the new section
    editSection(newSection);
  };

  return (
    <div className="arrangement-detector">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Arrangement Detection</span>
            <Button 
              onClick={detectArrangement} 
              disabled={isAnalyzing}
            >
              {isAnalyzing ? `Analyzing (${analysisProgress}%)` : 'Detect Arrangement'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress bar for analysis */}
          {isAnalyzing && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 mb-4 rounded">
              <div 
                className="bg-primary h-2 rounded"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
          )}
          
          {/* Arrangement sections */}
          <div className="arrangement-sections mb-4">
            <h3 className="text-sm font-medium mb-2">Detected Sections</h3>
            {arrangement.length > 0 ? (
              <div className="space-y-2">
                {arrangement.map(section => (
                  <ArrangementSectionItem 
                    key={section.id}
                    section={section}
                    onEdit={editSection}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No arrangement detected yet. Click "Detect Arrangement" to analyze the track.
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={addCustomSection}>
              Add Custom Section
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-48"
              />
              <Button 
                onClick={saveAsTemplate}
                disabled={!templateName.trim() || arrangement.length === 0}
              >
                Save as Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit section dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-label">Label</Label>
              <Input
                id="section-label"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="section-type">Type</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(sectionColors).map(type => (
                  <Badge
                    key={type}
                    onClick={() => setCustomType(type as ArrangementSection['type'])}
                    className={`cursor-pointer ${
                      customType === type ? 'bg-primary' : 'bg-secondary'
                    }`}
                    style={{ 
                      backgroundColor: customType === type ? sectionColors[type as keyof typeof sectionColors] : 'transparent',
                      color: customType === type ? 'white' : 'inherit'
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdits}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default ArrangementDetector;