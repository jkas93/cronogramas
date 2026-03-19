'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  projectId: string;
}

export function ImportExcelButton({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Tipo: 'Partida', Nombre: 'Estructuras', Inicio: '', Fin: '', Peso: '' },
      { Tipo: 'Item', Nombre: 'Zapatas', Inicio: '', Fin: '', Peso: '' },
      { Tipo: 'Actividad', Nombre: 'Excavación manual', Inicio: '2024-05-01', Fin: '2024-05-05', Peso: '1' },
      { Tipo: 'Actividad', Nombre: 'Vaciado de concreto', Inicio: '2024-05-06', Fin: '2024-05-07', Peso: '2' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_cronograma.xlsx");
  };

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) {
        throw new Error('El archivo Excel está vacío.');
      }

      let currentPartidaId: string | null = null;
      let currentItemId: string | null = null;
      
      let partidaSortOrder = 0;
      let itemSortOrder = 0;
      let activitySortOrder = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const tipo = (row['Tipo'] || '').toString().trim().toLowerCase();
        const nombre = (row['Nombre'] || '').toString().trim();
        const inicio = (row['Inicio'] || '').toString().trim();
        const fin = (row['Fin'] || '').toString().trim();
        const peso = parseFloat(row['Peso']) || 1;

        if (!tipo || !nombre) continue;

        if (tipo === 'partida') {
          const { data: pData, error: pError } = await supabase
            .from('partidas')
            .insert({ project_id: projectId, name: nombre, sort_order: partidaSortOrder++ })
            .select()
            .single();
          
          if (pError) throw pError;
          currentPartidaId = pData.id;
          currentItemId = null; // reset item for new partida
          itemSortOrder = 0; // reset sort order

        } else if (tipo === 'item') {
          if (!currentPartidaId) {
            // Throw error or auto-create a default partida
            const { data: pDefault } = await supabase
              .from('partidas')
              .insert({ project_id: projectId, name: 'Partida por Defecto', sort_order: partidaSortOrder++ })
              .select()
              .single();
            currentPartidaId = pDefault!.id;
          }
          const { data: iData, error: iError } = await supabase
            .from('items')
            .insert({ partida_id: currentPartidaId, name: nombre, sort_order: itemSortOrder++ })
            .select()
            .single();
            
          if (iError) throw iError;
          currentItemId = iData.id;
          activitySortOrder = 0;

        } else if (tipo === 'actividad' || tipo === 'activity') {
          if (!currentItemId) {
            if (!currentPartidaId) {
              const { data: pDefault } = await supabase
                .from('partidas')
                .insert({ project_id: projectId, name: 'Partida por Defecto', sort_order: partidaSortOrder++ })
                .select()
                .single();
              currentPartidaId = pDefault!.id;
            }
            const { data: iDefault } = await supabase
              .from('items')
              .insert({ partida_id: currentPartidaId, name: 'Ítem por Defecto', sort_order: itemSortOrder++ })
              .select()
              .single();
            currentItemId = iDefault!.id;
          }

          // Format dates (handle excel raw number dates if necessary, or just expect 'YYYY-MM-DD')
          let startDate = inicio || new Date().toISOString().split('T')[0];
          let endDate = fin || new Date().toISOString().split('T')[0];
          
          // Basic check for Excel serial date numbers
          if (!isNaN(Number(startDate)) && String(startDate).indexOf('-') === -1) {
             const dateObj = new Date((Number(startDate) - (25567 + 2)) * 86400 * 1000);
             startDate = dateObj.toISOString().split('T')[0];
          }
          if (!isNaN(Number(endDate)) && String(endDate).indexOf('-') === -1) {
             const dateObj = new Date((Number(endDate) - (25567 + 2)) * 86400 * 1000);
             endDate = dateObj.toISOString().split('T')[0];
          }

          const { error: aError } = await supabase
            .from('activities')
            .insert({
              item_id: currentItemId,
              name: nombre,
              start_date: startDate,
              end_date: endDate,
              weight: peso,
              sort_order: activitySortOrder++
            });
            
          if (aError) throw aError;
        }
      }

      router.refresh(); // Reload Gantt data
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al procesar el archivo Excel.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button 
        onClick={handleDownloadTemplate} 
        disabled={loading}
        className="btn-secondary text-xs px-2 py-1.5 flex items-center gap-1.5 opacity-70 hover:opacity-100"
        title="Descargar Plantilla Excel"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span className="hidden md:inline">Plantilla</span>
      </button>

      <label className={`btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`} title="Importar Excel">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="hidden sm:inline">{loading ? 'Importando...' : 'Importar Excel'}</span>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          onChange={processFile} 
        />
      </label>
      {error && <span className="absolute mt-10 right-0 text-danger-400 text-[10px] truncate max-w-[200px]" title={error}>{error}</span>}
    </div>
  );
}
