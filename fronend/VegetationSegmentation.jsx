import { useState } from 'react';
import { DragDropUploader } from './DragDropUploader';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../utils/api';

const ensureDataUrl = (v) => {
  if (!v) return '';
  return v.startsWith('data:') ? v : `data:image/png;base64,${v}`;
};

export function VegetationSegmentation() {
  const [originalImage, setOriginalImage] = useState('');
  const [originalFile, setOriginalFile] = useState(null);
  const [segmentedImage, setSegmentedImage] = useState('');
  const [confidence, setConfidence] = useState(0.5);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(null); // { coverage, segments, processingTime }

  const handleImageUpload = (file, preview) => {
    setOriginalImage(preview);
    setOriginalFile(file);
    setSegmentedImage('');
    setStats(null);
    toast.success('Image uploaded');
  };

  const handleClear = () => {
    setOriginalImage('');
    setOriginalFile(null);
    setSegmentedImage('');
    setStats(null);
  };

  const handleRunSegmentation = async () => {
    if (!originalFile) {
      toast.error('Please upload an image first');
      return;
    }

    setIsProcessing(true);
    try {
      // api.segmentImage should POST to /predict/vegetation and return JSON.
      // Make it return keys like: { segmentedImageUrl | image_base64 | mask_base64, vegetationCoverage, segmentsDetected, processingTime }
      const result = await api.segmentImage(originalFile, confidence, iouThreshold);

      const img =
        result.segmentedImageUrl ||
        result.image_base64 ||
        result.mask_base64 ||
        result.result ||
        result.image ||
        '';

      if (!img) throw new Error('Backend did not return a segmented image');

      setSegmentedImage(ensureDataUrl(img));
      setStats({
        coverage: result.vegetationCoverage ?? result.coverage ?? 0,
        segments: result.segmentsDetected ?? result.segments ?? 0,
        processingTime: result.processingTime ?? result.time ?? 0,
      });
      toast.success('Segmentation complete');
    } catch (error) {
      console.error('Segmentation error:', error);
      toast.error(error?.message || 'Segmentation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Upload & Controls */}
      <div className="space-y-6">
        <DragDropUploader
          onImageUpload={handleImageUpload}
          currentImage={originalImage}
          onClear={handleClear}
        />

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

              <div>
                <div className="flex justify-between mb-2">
                  <Label>IoU Threshold</Label>
                  <span className="text-sm text-gray-600">{iouThreshold.toFixed(2)}</span>
                </div>
                <Slider
                  value={[iouThreshold]}
                  onValueChange={([val]) => setIouThreshold(val)}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleRunSegmentation}
            disabled={!originalImage || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Segmentation
              </>
            )}
          </Button>
        </Card>

        {/* Statistics */}
        {stats && (
          <Card className="p-6">
            <h3 className="mb-4">Results</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Coverage</p>
                <p className="text-2xl text-green-600">{Number(stats.coverage).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Segments</p>
                <p className="text-2xl">{stats.segments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="text-2xl">{Number(stats.processingTime).toFixed(2)}s</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Right Panel - Results */}
      <div>
        {originalImage ? (
          <Card className="p-0 overflow-hidden">
            <Tabs defaultValue="segmented" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="segmented">Segmented</TabsTrigger>
                <TabsTrigger value="comparison">Side by Side</TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="m-0">
                <img src={originalImage} alt="Original" className="w-full h-auto" />
              </TabsContent>

              <TabsContent value="segmented" className="m-0">
                {segmentedImage ? (
                  <img src={segmentedImage} alt="Segmented" className="w-full h-auto" />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    Run segmentation to see results
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comparison" className="m-0">
                {segmentedImage ? (
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Original</p>
                      <img src={originalImage} alt="Original" className="w-full h-auto rounded" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Segmented</p>
                      <img src={segmentedImage} alt="Segmented" className="w-full h-auto rounded" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    Run segmentation to see comparison
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center p-12 bg-gray-50">
            <p className="text-gray-400">Upload an image to begin</p>
          </Card>
        )}
      </div>
    </div>
  );
}
