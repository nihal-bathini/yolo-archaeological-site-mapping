import { useState, useMemo } from 'react';
import { DragDropUploader } from './DragDropUploader';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../utils/api';
import { Badge } from './ui/badge';

const SOIL_TYPES = [
  { name: 'Alluvial Soil', color: '#D2B48C', description: 'Rich in nutrients; ideal for agriculture.' },
  { name: 'Red Soil',      color: '#CD5C5C', description: 'Iron-rich; good drainage; cotton/wheat/pulses.' },
  { name: 'Black Soil',    color: '#2C2C2C', description: 'High clay; retains moisture; great for cotton.' },
  { name: 'Clay Soil',     color: '#E6C79C', description: 'Heavy soil; high retention; needs compost to improve quality.' },
];

// quick color lookup fallback by label
function colorForLabel(label) {
  const match = SOIL_TYPES.find(s => s.name.toLowerCase() === String(label || '').toLowerCase());
  if (match) return match.color;
  // default color if backend sends unseen label
  return '#3B82F6';
}

export function SoilDetection() {
  const [originalImage, setOriginalImage] = useState('');
  const [originalFile, setOriginalFile] = useState(null);
  const [confidence, setConfidence] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);

  const [annotatedImage, setAnnotatedImage] = useState('');
  const [boxes, setBoxes] = useState([]);                 // [{x1,y1,x2,y2,conf,label,cls}...]
  const [legend, setLegend] = useState(null);             // optional from backend: {label:"#hex",...}

  const handleImageUpload = (file, preview) => {
    setOriginalImage(preview);
    setOriginalFile(file);
    setAnnotatedImage('');
    setBoxes([]);
    setLegend(null);
    toast.success('Image uploaded');
  };

  const handleClear = () => {
    setOriginalImage('');
    setOriginalFile(null);
    setAnnotatedImage('');
    setBoxes([]);
    setLegend(null);
  };

  const handleRunDetection = async () => {
    if (!originalFile) {
      toast.error('Please upload an image first');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await api.detectSoil(originalFile, confidence);
      if (result.annotatedImageUrl) setAnnotatedImage(result.annotatedImageUrl);
      setBoxes(Array.isArray(result.raw?.boxes) ? result.raw.boxes : []);
      setLegend(result.legend || result.raw?.legend || null);

      const count = Array.isArray(result.raw?.boxes) ? result.raw.boxes.length : 0;
      toast.success(count ? `Detected ${count} region${count > 1 ? 's' : ''}` : 'No soil regions detected');
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Detection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const avgConfidence = useMemo(() => {
    if (!boxes.length) return 0;
    const sum = boxes.reduce((s, b) => s + (Number(b.conf) || 0), 0);
    return (sum / boxes.length) * 100;
  }, [boxes]);

  // per-soil counts
  const perSoil = useMemo(() => {
    const m = new Map();
    for (const b of boxes) {
      const key = b.label || 'Soil';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries()).map(([label, count]) => ({ label, count }));
  }, [boxes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Uploader, Parameters, Results */}
      <div className="space-y-6">
        {/* Original preview lives here (inside uploader), like vegetation */}
        <DragDropUploader
          onImageUpload={handleImageUpload}
          currentImage={originalImage}
          onClear={handleClear}
        />

        {/* Parameters */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="mb-4">Parameters</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm text-gray-600">{confidence.toFixed(2)}</span>
                </div>
                <Slider
                  value={[confidence]}
                  onValueChange={([val]) => setConfidence(val)}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleRunDetection}
            disabled={!originalFile || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Detect Soil
              </>
            )}
          </Button>
        </Card>

        {/* Results card (totals + list) */}
        {boxes.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="mb-4">Detection Results</h3>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Regions</p>
                <p className="text-2xl">{boxes.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl">{avgConfidence.toFixed(1)}%</p>
              </div>
            </div>

            {/* Per-soil breakdown */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Per-soil breakdown</p>
              <div className="space-y-2">
                {perSoil.map(({ label, count }) => {
                  const color =
                    (legend && legend[label]) || colorForLabel(label);
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm">{label}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed list */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Detections</p>
              <div className="space-y-2">
                {boxes.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">{b.label ?? 'Soil'}</span>
                      {typeof b.conf === 'number' && (
                        <span className="text-gray-500"> • {(b.conf * 100).toFixed(1)}%</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      [{Math.round(b.x1)},{Math.round(b.y1)}]→[{Math.round(b.x2)},{Math.round(b.y2)}]
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Legend (always visible like before) */}
        <Card className="p-6">
          <h3 className="mb-4">Indian Soil Types</h3>
          <div className="space-y-2">
            {SOIL_TYPES.map((soil) => (
              <div key={soil.name} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: soil.color }}
                />
                <div className="flex-1">
                  <p className="text-sm">{soil.name}</p>
                  <p className="text-xs text-gray-500">{soil.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT: Output image with boxes (annotated) */}
      <div className="space-y-6">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold">Annotated Output</h3>
          </div>
          {annotatedImage ? (
            <img src={annotatedImage} alt="Soil detections" className="w-full h-auto" />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Run detection to see boxed output
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
