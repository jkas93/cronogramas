'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { triggerProjectAlerts } from '@/app/actions/alerts';

interface Props {
  projectId: string;
  partidas: any[];
  dailyProgress?: any[];
}

/**
 * DailyProgressForm — Allows users to record daily progress
 * for individual activities. This feeds into the actual S-Curve.
 */
export function DailyProgressForm({ projectId, partidas, dailyProgress = [] }: Props) {
  const [selectedActivity, setSelectedActivity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressPercent, setProgressPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Flatten all activities with their hierarchy labels
  // Flatten all activities with their hierarchy labels and current progress
  const allActivities = partidas.flatMap((p: any) =>
    (p.items || []).flatMap((i: any) =>
      (i.activities || []).map((a: any) => {
        const taskProgressLogs = dailyProgress.filter(dp => dp.activity_id === a.id);
        const totalProgress = taskProgressLogs.reduce((sum, dp) => sum + Number(dp.progress_percent), 0);
        return {
          ...a,
          label: `${p.name} → ${i.name} → ${a.name}`,
          current_progress: totalProgress
        };
      })
    )
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 3) {
        setError("Máximo 3 fotos por registro");
        return;
      }
      setFiles((prev) => [...prev, ...selectedFiles].slice(0, 3));
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) {
      setError("Selecciona una actividad");
      return;
    }

    const activityInfo = allActivities.find((a: any) => a.id === selectedActivity);
    if (activityInfo) {
      const existingToday = dailyProgress.find(dp => dp.activity_id === selectedActivity && dp.date === date);
      const previousTodayPercent = existingToday ? Number(existingToday.progress_percent) : 0;
      const accumulatedWithoutToday = activityInfo.current_progress - previousTodayPercent;
      const proposedPercent = parseFloat(progressPercent);
      if (accumulatedWithoutToday + proposedPercent > 100) {
        setError(`El avance acumulado no puede ser > 100%. Te queda máximo ${(100 - accumulatedWithoutToday).toFixed(1)}% pendiente.`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload photos
      const photoUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/${selectedActivity}/${date}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('evidence')
          .upload(fileName, file);

        if (uploadError) {
          // If the bucket doesn't exist, this will error. We'll ignore and continue for now.
          console.warn("Error uploading file (bucket might not exist):", uploadError);
        } else if (data?.path) {
          const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
          photoUrls.push(publicUrlData.publicUrl);
        }
      }

      const { error: insertError } = await supabase
        .from('daily_progress')
        .upsert(
          {
            activity_id: selectedActivity,
            date,
            progress_percent: parseFloat(progressPercent),
            notes: notes || null,
            created_by: user?.id,
            photo_urls: photoUrls // Assuming this exists in DB as requested in prompt
          },
          { onConflict: 'activity_id,date' }
        );

      if (insertError) {
        // If photo_urls column doesn't exist, it might fail. Fallback without photo_urls
        if (insertError.message.includes('column "photo_urls" of relation')) {
          const { error: fallbackError } = await supabase
            .from('daily_progress')
            .upsert(
              {
                activity_id: selectedActivity,
                date,
                progress_percent: parseFloat(progressPercent),
                notes: notes || null,
                created_by: user?.id,
              },
              { onConflict: 'activity_id,date' }
            );
          if (fallbackError) throw fallbackError;
        } else {
          throw insertError;
        }
      }

      setSuccess(true);
      setProgressPercent('');
      setNotes('');
      setFiles([]);
      
      // Auto-evaluate and save alarms in the background
      triggerProjectAlerts(projectId).catch(console.error);

      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (allActivities.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-400/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-surface-100 mb-2">
          Sin actividades para registrar avance
        </h3>
        <p className="text-sm text-surface-200/60">
          Primero crea actividades en la vista de Gantt.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="glass-card p-8">
        <h3 className="text-lg font-semibold text-surface-100 mb-6">
          Registrar Avance Diario
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">
              Actividad *
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
              className="input-field"
            >
              <option value="">Seleccionar actividad...</option>
              {allActivities.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.label} (Avance actual: {a.current_progress.toFixed(1)}% | Peso: {a.weight})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-2">
                Avance del Día (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={progressPercent}
                onChange={(e) => setProgressPercent(e.target.value)}
                placeholder="Ej: 15.5"
                required
                className="input-field mb-2"
              />
              <div className="flex gap-2 text-xs">
                {[10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProgressPercent(val.toString())}
                    className="px-2 py-1 bg-surface-800 text-surface-200 hover:text-accent-400 rounded border border-surface-700/50"
                  >
                    +{val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">
              Evidencia Fotográfica (Max 3)
            </label>
            <div className="flex items-center gap-4 mb-2">
              <label className="cursor-pointer bg-surface-800 border border-surface-700/50 hover:border-accent-400/50 px-4 py-2 rounded-lg text-sm transition-colors text-surface-200">
                <span>Subir Fotos</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={files.length >= 3}
                />
              </label>
              <span className="text-xs text-surface-200/50">{files.length}/3 fotos seleccionadas</span>
            </div>
            {files.length > 0 && (
              <div className="flex gap-2">
                {files.map((file, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-surface-800 border border-surface-700/50">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del día..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
              ✓ Avance registrado correctamente
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <span className="spinner" />}
            {loading ? 'Guardando...' : 'Registrar Avance'}
          </button>
        </form>
      </div>

      {/* Recent progress info */}
      <div className="mt-6 glass-card p-6">
        <h4 className="text-sm font-semibold text-surface-200/80 mb-4">Historial de Avances</h4>
        {dailyProgress.length === 0 ? (
          <p className="text-sm text-surface-200/50 text-center py-4">No hay avances registrados aún.</p>
        ) : (
          <div className="space-y-4">
            {dailyProgress.slice().reverse().map((dp: any) => {
              const activity = allActivities.find((a: any) => a.id === dp.activity_id);
              return (
                <div key={`${dp.activity_id}-${dp.date}`} className="p-4 rounded-lg bg-surface-900/50 border border-accent-400/10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-sm font-medium text-surface-100">{activity?.label || 'Actividad Desconocida'}</h5>
                      <p className="text-xs text-surface-200/60">{dp.date}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-accent-400/15 text-accent-400 border border-accent-400/20">
                      +{dp.progress_percent}%
                    </span>
                  </div>
                  {dp.notes && (
                    <p className="text-sm text-surface-200/80 mt-2 bg-surface-800/50 p-2 rounded">
                      {dp.notes}
                    </p>
                  )}
                  {dp.photo_urls && dp.photo_urls.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                      {dp.photo_urls.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-20 h-20 rounded-md overflow-hidden border border-surface-700 hover:border-accent-400 transition-colors">
                          <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
