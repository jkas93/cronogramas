'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SCurveChart } from '@/components/charts/SCurveChart';
import { GanttView } from '@/components/gantt/GanttView';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [partidas, setPartidas] = useState<any[]>([]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyProgress, setDailyProgress] = useState<any[]>([]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      const { data: pData } = await supabase.from('projects').select('*').eq('id', id).single();
      const { data: pList } = await supabase.from('partidas').select('*, items(*, activities(*))').eq('project_id', id).order('sort_order');
      
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activityIds = (pList || []).flatMap((p: any) => p.items || []).flatMap((i: any) => i.activities || []).map((a: any) => a.id);
      const { data: dpData } = await supabase.from('daily_progress').select('*').in('activity_id', activityIds).order('date');
      
      // Fetch milestones
      const { data: msData } = await supabase.from('project_milestones').select('*').eq('project_id', id).order('date');

      setProject(pData);
      setPartidas(pList || []);
      setDailyProgress(dpData || []);
      setMilestones(msData || []);
      setLoading(false);

      // Trigger standard print when everything is fully loaded and drawn.
      // Dhtmlx-gantt and Echarts need ~1s to fully render.
      setTimeout(() => {
        window.print();
      }, 1500);
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 text-center"><span className="spinner"></span> Generando PDF...</div>;
  if (!project) return <div className="p-10 text-center">Proyecto no encontrado.</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0">
      
      <div className="flex justify-between items-center mb-8 border-b pb-4 border-surface-200/30 print:hidden">
         <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-600">
            Vista de Impresión / PDF
         </h1>
         <button onClick={() => window.print()} className="btn-primary flex gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir Ahora
         </button>
      </div>

      <div className="max-w-[1200px] mx-auto print:max-w-full">
         
         <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-primary-800 uppercase tracking-widest">{project.name}</h1>
            <p className="text-sm text-surface-400 mt-2 font-medium">REPORTE OFICIAL DE AVANCE</p>
            <p className="text-xs text-surface-400 mt-1">
              {format(parseISO(project.start_date), 'dd MMM yyyy', { locale: es })} → {format(parseISO(project.end_date), 'dd MMM yyyy', { locale: es })}
            </p>
         </div>

         {/* Curva S */}
         <div className="mb-12 page-break-after">
            <h2 className="text-xl font-bold border-b border-surface-200/30 pb-2 mb-4 text-primary-700">1. Analíticas Curva S (EVM)</h2>
            <div className="h-[400px] rounded-lg border border-surface-200/20 bg-surface-50 p-4 print:border-none print:shadow-none">
              <SCurveChart 
                project={project} 
                partidas={partidas} 
                dailyProgress={dailyProgress} 
                milestones={milestones} 
              />
            </div>
         </div>

         {/* Gantt Chart (Requires scaling for print, dhtmlx natively handles it okay mostly) */}
         <div className="mb-12">
            <h2 className="text-xl font-bold border-b border-surface-200/30 pb-2 mb-4 text-primary-700">2. Cronograma General (Gantt)</h2>
            <div className="rounded-lg border border-surface-200/20 print:border-none print:shadow-none">
              <GanttView projectId={project.id} partidas={partidas} dailyProgress={dailyProgress} readonly={true} />
            </div>
         </div>

         <div className="mt-20 pt-8 border-t border-surface-200/30 text-center text-xs text-surface-400 font-mono">
            Reporte generado automáticamente por Cronograma Golden Tower Construction.
         </div>

      </div>

      {/* Print-specific styles — standard style tag, works in App Router */}
      <style>{`
        @media print {
          body { background-color: white !important; color: black !important; }
          .glass-card, .bg-mesh { display: none !important; }
          .page-break-after { page-break-after: always; }
          .gantt_container { border: 1px solid #ddd !important; }
          #__next-build-watcher, .nextjs-toast-errors-parent { display: none !important; }
        }
      `}</style>
    </div>
  );
}
