import React from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';

interface Props {
  photoUrls: string[];
  initialIndex: number;
  date: string;
  onClose: () => void;
}

export function ProgressLightbox({ photoUrls, initialIndex, date, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  const nextImg = () => {
    if (currentIndex < photoUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevImg = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="photo-lightbox animate-fade-in z-50 fixed inset-0 bg-primary-900/95 backdrop-blur-md flex items-center justify-center flex-col">
      {/* Lightbox Toolbar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="bg-primary-900/50 backdrop-blur-lg px-4 py-2 rounded-full border border-surface-700/20 text-surface-200 text-sm font-semibold tracking-wide">
          {format(parseISO(date), "dd MMM, yyyy")}
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-primary-900/50 border border-surface-700/20 text-white flex items-center justify-center hover:bg-danger-500/20 hover:text-danger-400 hover:border-danger-500/40 transition-all shadow-xl backdrop-blur-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="relative w-full max-w-5xl h-full max-h-[80vh] flex items-center justify-center px-4 md:px-12">
        {photoUrls.length > 1 && (
          <button 
            onClick={prevImg} 
            disabled={currentIndex === 0} 
            className="absolute left-4 z-40 p-4 rounded-full bg-primary-900/50 border border-surface-700/20 text-white disabled:opacity-30 hover:bg-surface-800 disabled:hover:bg-primary-900/50 transition-colors backdrop-blur-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        
        <div className="relative w-full h-full">
          <Image 
            src={photoUrls[currentIndex]} 
            alt="Avance ampliado" 
            fill
            style={{ objectFit: 'contain' }}
            unoptimized
            className="rounded-lg shadow-2xl drag-none select-none transition-transform duration-300" 
          />
        </div>

        {photoUrls.length > 1 && (
          <button 
            onClick={nextImg} 
            disabled={currentIndex === photoUrls.length - 1} 
            className="absolute right-4 z-40 p-4 rounded-full bg-primary-900/50 border border-surface-700/20 text-white disabled:opacity-30 hover:bg-surface-800 disabled:hover:bg-primary-900/50 transition-colors backdrop-blur-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
        
        {/* Dots indicator */}
        {photoUrls.length > 1 && (
          <div className="absolute bottom-[-3rem] left-0 w-full flex justify-center gap-2">
            {photoUrls.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? 'bg-accent-400 w-8' : 'bg-surface-600 hover:bg-surface-400'}`}
                aria-label={`Ver foto ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
