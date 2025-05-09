import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Download, FileMusic, Tags } from 'lucide-react';
import { toast } from './ui/sonner';

interface Stem {
  id: string;
  type: 'vocals' | 'bass' | 'drums' | 'other';
  name: string;
}

interface ExportStemsPanelProps {
  stems: Stem[];
  isExporting: boolean;
  onExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  stems: string[];
  format: 'wav' | 'mp3' | 'flac';
  sampleRate: '44100' | '48000' | '96000';
  bitDepth: '16' | '24';
  includeMetadata: boolean;
  normalizeAudio: boolean;
}

// Reusable component for rendering labeled switches
const LabeledSwitch = ({ id, label, isChecked, onChange }: { id: string; label: string; isChecked: boolean; onChange: (checked: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <Label htmlFor={id}>{label}</Label>
    <Switch id={id} checked={isChecked} onCheckedChange={onChange} />
  </div>
);

export default function ExportStemsPanel({ stems, isExporting, onExport }: ExportStemsPanelProps) {
  const [selectedStems, setSelectedStems] = useState<string[]>(stems.map(stem => stem.id));
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3' | 'flac'>('wav');
  const [sampleRate, setSampleRate] = useState<'44100' | '48000' | '96000'>('44100');
  const [bitDepth, setBitDepth] = useState<'16' | '24'>('16');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [normalizeAudio, setNormalizeAudio] = useState(false);

  const handleStemToggle = (stemId: string) => {
    setSelectedStems(prev => 
      prev.includes(stemId) 
        ? prev.filter(id => id !== stemId)
        : [...prev, stemId]
    );
  };
  
  const handleExport = () => {
    if (selectedStems.length === 0) {
      toast.error('Please select at least one stem to export');
      return;
    }
    
    onExport({
      stems: selectedStems,
      format: exportFormat,
      sampleRate,
      bitDepth,
      includeMetadata,
      normalizeAudio
    });
  };

  if (stems.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center py-10">
          <FileMusic className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-medium mt-4">No Stems Available</h3>
          <p className="text-muted-foreground mt-2">Separate a track to create stems for export</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Download className="mr-2 h-5 w-5" />
          Export Stems
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Select Stems to Export</Label>
            <div className="space-y-2">
              {stems.map((stem) => (
                <div key={stem.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`stem-${stem.id}`}
                    checked={selectedStems.includes(stem.id)}
                    onCheckedChange={() => handleStemToggle(stem.id)}
                  />
                  <Label htmlFor={`stem-${stem.id}`} className="flex-grow">{stem.name}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select 
                value={exportFormat} 
                onValueChange={(value) => setExportFormat(value as 'wav' | 'mp3' | 'flac')}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="flac">FLAC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-rate">Sample Rate</Label>
              <Select 
                value={sampleRate} 
                onValueChange={(value) => setSampleRate(value as '44100' | '48000' | '96000')}
              >
                <SelectTrigger id="sample-rate">
                  <SelectValue placeholder="Select sample rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="44100">44.1 kHz</SelectItem>
                  <SelectItem value="48000">48 kHz</SelectItem>
                  <SelectItem value="96000">96 kHz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bit-depth">Bit Depth</Label>
              <Select 
                value={bitDepth} 
                onValueChange={(value) => setBitDepth(value as '16' | '24')}
                disabled={exportFormat === 'mp3'}
              >
                <SelectTrigger id="bit-depth">
                  <SelectValue placeholder="Select bit depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16-bit</SelectItem>
                  <SelectItem value="24">24-bit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <LabeledSwitch 
              id="include-metadata" 
              label="Include ID3 Tags & Analysis Data" 
              isChecked={includeMetadata} 
              onChange={setIncludeMetadata} 
            />
            <LabeledSwitch 
              id="normalize-audio" 
              label="Normalize Audio (-14 LUFS)" 
              isChecked={normalizeAudio} 
              onChange={setNormalizeAudio} 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleExport}
          disabled={isExporting || selectedStems.length === 0}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isExporting ? 'Exporting...' : 'Export Selected Stems'}
        </Button>
      </CardFooter>
    </Card>
  );
}
