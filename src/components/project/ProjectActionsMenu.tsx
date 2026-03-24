'use client';

import { useState, useRef, useEffect } from 'react';
import { DeleteProjectButton } from './DeleteProjectButton';
import { ReportExportButton } from './ReportExportButton';
import { TeamModal } from './TeamModal';
import { ShareModal } from './ShareModal';

interface ProjectActionsMenuProps {
  project: any;
  isOwner: boolean;
}

export function ProjectActionsMenu({ project, isOwner }: ProjectActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-all flex items-center justify-center border ${
          isOpen 
            ? 'bg-surface-800 border-surface-600 text-surface-100 shadow-lg' 
            : 'bg-surface-900/50 border-surface-800 text-surface-400 hover:text-surface-100 hover:border-surface-700'
        }`}
        title="Opciones del Proyecto"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl z-[100] overflow-hidden fade-in py-1">
          {/* Section: Management */}
          <div className="py-1">
            <TeamModal 
              projectId={project.id} 
              projectName={project.name} 
              isOwner={isOwner} 
              variant="menuItem" 
            />
            <ShareModal 
              projectId={project.id} 
              initialToken={project.share_token} 
              projectName={project.name} 
              variant="menuItem"
            />
          </div>

          <div className="border-t border-surface-800 my-1"></div>

          {/* Section: Output */}
          <div className="py-1">
            <ReportExportButton projectId={project.id} variant="menuItem" />
          </div>

          {isOwner && (
            <>
              <div className="border-t border-surface-800 my-1"></div>
              {/* Section: Danger */}
              <div className="py-1">
                <DeleteProjectButton 
                   projectId={project.id} 
                   projectName={project.name} 
                   variant="menuItem" 
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
