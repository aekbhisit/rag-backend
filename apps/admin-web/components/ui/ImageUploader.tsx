"use client";

import React from "react";
import { useDialog } from "./DialogProvider";

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  allowUrlInput?: boolean;
}

export function ImageUploader({ 
  images = [], 
  onImagesChange, 
  maxImages = 5,
  allowUrlInput = true 
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dialog = useDialog();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: string[] = [];
    const remainingSlots = maxImages - images.length;

    Array.from(files).slice(0, remainingSlots).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            if (newImages.length === Math.min(files.length, remainingSlots)) {
              onImagesChange([...images, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const addImageUrl = async () => {
    if (urlInput.trim() && images.length < maxImages) {
      // Basic URL validation
      try {
        new URL(urlInput);
        onImagesChange([...images, urlInput.trim()]);
        setUrlInput("");
      } catch {
        await dialog.alert({ title: 'Invalid URL', description: 'Please enter a valid URL.' });
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      reorderImages(index, index - 1);
    }
  };

  const moveImageDown = (index: number) => {
    if (index < images.length - 1) {
      reorderImages(index, index + 1);
    }
  };

  const confirmRemoveImage = async (index: number, imageName: string) => {
    const ok = await dialog.confirm({ title: 'Remove image', description: `Are you sure you want to remove this image?\n\n${imageName}`, confirmText: 'Remove', variant: 'danger' });
    if (ok) removeImage(index);
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-[color:var(--text)]">
        Images ({images.length}/{maxImages})
      </label>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f3f4f6'/><text x='50' y='50' text-anchor='middle' dominant-baseline='middle' font-family='Arial' font-size='12' fill='%23666'>No Image</text></svg>";
                }}
              />
              
              {/* Controls */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <div className="flex items-center justify-center h-full gap-2">
                  <button
                    type="button"
                    onClick={() => confirmRemoveImage(index, `Image ${index + 1}`)}
                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => moveImageUp(index)}
                    disabled={index === 0}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => moveImageDown(index)}
                    disabled={index === images.length - 1}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Sort Order Indicator */}
                <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>
              
              {index === 0 && (
                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="text-gray-600 mb-4">
            Drag and drop images here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              browse files
            </button>
          </p>
          
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 10MB each
          </p>
        </div>
      )}

      {/* URL Input */}
      {allowUrlInput && images.length < maxImages && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Or paste image URL here..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            onKeyPress={(e) => e.key === 'Enter' && addImageUrl()}
          />
          <button
            type="button"
            onClick={addImageUrl}
            disabled={!urlInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Add URL
          </button>
        </div>
      )}

      <div className="text-xs text-gray-500">
        The first image will be used as the primary image. Click and drag to reorder.
      </div>
    </div>
  );
}
