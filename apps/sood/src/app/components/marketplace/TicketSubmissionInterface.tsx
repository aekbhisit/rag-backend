"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ocrService } from '@/app/lib/ocrService';

interface TicketSubmissionProps {
  onSubmit: (data: any) => Promise<void>;
  userId: string;
}

const TicketSubmissionInterface: React.FC<TicketSubmissionProps> = ({ onSubmit, userId }) => {
  const [formData, setFormData] = useState({
    title: '', category: 'CONCERT', eventName: '', eventDate: '',
    venue: '', city: '', sellingPrice: '', quantity: 1
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    setImages(files);
    if (files[0]) {
      setProcessing(true);
      try {
        const ocr = await ocrService.processTicketImage(files[0], userId);
        setOcrResults(ocr);
        if (ocr.detectedFields) {
          setFormData(prev => ({
            ...prev,
            eventName: ocr.detectedFields.eventName || prev.eventName,
            venue: ocr.detectedFields.venue || prev.venue,
            sellingPrice: ocr.detectedFields.price?.toString() || prev.sellingPrice
          }));
        }
      } catch (error) {
        console.error('OCR failed:', error);
      }
      setProcessing(false);
    }
  }, [userId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 3
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({ ...formData, sellerId: userId, images: ['mock-url'] });
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">List Your Tickets</h2>
      
      {/* Image Upload */}
      <div className="mb-4">
        <div {...getRootProps()} className="border-2 border-dashed p-6 text-center cursor-pointer rounded-lg">
          <input {...getInputProps()} />
          {processing ? '🔄 Processing...' : 
           isDragActive ? 'Drop images here' : 
           '📷 Upload ticket images for AI analysis'}
        </div>
        
        {ocrResults && (
          <div className="mt-2 p-3 bg-green-50 rounded text-sm">
            ✅ AI extracted: {Object.keys(ocrResults.detectedFields).length} fields
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Event Name"
            value={formData.eventName}
            onChange={e => setFormData({...formData, eventName: e.target.value})}
            className="p-2 border rounded"
            required
          />
          
          <select
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            className="p-2 border rounded"
          >
            <option value="CONCERT">Concert</option>
            <option value="SPORTS">Sports</option>
            <option value="THEATER">Theater</option>
          </select>

          <input
            placeholder="Venue"
            value={formData.venue}
            onChange={e => setFormData({...formData, venue: e.target.value})}
            className="p-2 border rounded"
            required
          />

          <input
            placeholder="City"
            value={formData.city}
            onChange={e => setFormData({...formData, city: e.target.value})}
            className="p-2 border rounded"
            required
          />

          <input
            type="datetime-local"
            value={formData.eventDate}
            onChange={e => setFormData({...formData, eventDate: e.target.value})}
            className="p-2 border rounded"
            required
          />

          <input
            type="number"
            placeholder="Price ($)"
            value={formData.sellingPrice}
            onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
            className="p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!images.length}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          List Tickets
        </button>
      </form>
    </div>
  );
};

export default TicketSubmissionInterface;