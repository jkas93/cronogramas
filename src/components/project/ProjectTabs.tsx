'use client';

import { useState } from 'react';
import type { Project, Alert } from '@/lib/types';
import { GanttView } from '@/components/gantt/GanttView';
import { SCurveChart } from '@/components/charts/SCurveChart';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { DailyProgressForm } from '@/components/project/DailyProgressForm';

interface Props {
  project: Project;
  partidas: any[];
  dailyProgress: any[];
  alerts: Alert[];
}

const tabs = [
  { id: 'gantt', label: 'Gantt', icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12' },
  { id: 'scurve', label: 'Curva S', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'progress', label: 'Avance Diario', icon: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'alerts', label: 'Alertas', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
];

export function ProjectTabs({ project, partidas, dailyProgress, alerts }: Props) {
  const [activeTab, setActiveTab] = useState('gantt');

  // Count unread alerts
  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface-900/50 border border-accent-400/10 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent-400/15 text-accent-400 shadow-sm'
                : 'text-surface-200/60 hover:text-surface-200/80 hover:bg-surface-700/30'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
            {tab.id === 'alerts' && unreadAlerts > 0 && (
              <span className="w-5 h-5 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'gantt' && (
          <GanttView
            projectId={project.id}
            partidas={partidas}
            dailyProgress={dailyProgress}
          />
        )}
        {activeTab === 'scurve' && (
          <SCurveChart
            project={project}
            partidas={partidas}
            dailyProgress={dailyProgress}
          />
        )}
        {activeTab === 'progress' && (
          <DailyProgressForm
            projectId={project.id}
            partidas={partidas}
            dailyProgress={dailyProgress}
          />
        )}
        {activeTab === 'alerts' && (
          <AlertBanner
            alerts={alerts}
            projectId={project.id}
          />
        )}
      </div>
    </div>
  );
}
