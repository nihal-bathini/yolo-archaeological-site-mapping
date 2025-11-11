import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
// (optional) npm i prop-types
// import PropTypes from 'prop-types';

export function DragDropUploader({ onImageUpload, currentImage, onClear }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    const imageFile = files.find((file) => file.type?.startsWith('image/'));
    if (imageFile) handleFile(imageFile);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target?.result;
      if (preview) onImageUpload(file, String(preview));
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  if (currentImage) {
    return (
      <Card className="relative overflow-hidden">
        <img
          src={currentImage}
          alt="Uploaded"
          className="w-full h-auto object-contain max-h-[400px]"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="Clear image"
        >
          <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      className={`p-8 border-2 border-dashed cursor-pointer transition-all outline-none ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
      }`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {isDragging ? (
          <>
            <Upload className="h-16 w-16 text-blue-500" />
            <p className="text-blue-600">Drop image here</p>
          </>
        ) : (
          <>
            <ImageIcon className="h-16 w-16 text-gray-400" />
            <div>
              <p className="text-gray-600 mb-2">Drag and drop an image here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}