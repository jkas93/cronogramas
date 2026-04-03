import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { triggerProjectAlerts } from '@/app/actions/alerts';
import { compressImage } from '@/lib/utils/imageCompression';
import { EditedValues, EnhancedActivity, EnhancedPartida } from './types';

interface UsePulseSaveProps {
  projectId: string;
  selectedDate: string;
  activeActivitiesByPartida: EnhancedPartida[];
  onSaveSuccess: () => void;
}

export function usePulseSave({ 
  projectId, 
  selectedDate, 
  activeActivitiesByPartida, 
  onSaveSuccess 
}: UsePulseSaveProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSaveAll = async (editedValues: EditedValues) => {
    if (isSubmitting) return;
    
    const activitiesToSave = Object.keys(editedValues).filter(id => {
      const val = editedValues[id];
      return val.percent !== '' || val.notes !== '' || val.files.length > 0 || val.hasRestriction !== undefined || val.restrictionReason !== '';
    });

    if (activitiesToSave.length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchRecords: any[] = [];
      const photoUploads: { activityId: string, files: File[] }[] = [];

      for (const activityId of activitiesToSave) {
        const { percent, notes, files, hasRestriction, restrictionReason } = editedValues[activityId];
        
        // Find activity info
        let activityInfo: EnhancedActivity | null = null;
        activeActivitiesByPartida.forEach((p) => {
          p.items.forEach((i) => {
            const found = i.activities.find((a) => a.id === activityId);
            if (found) activityInfo = found;
          });
        });

        if (!activityInfo) continue;
        const info = activityInfo as EnhancedActivity;

        // Validation
        const proposedPercent = parseFloat(percent || '0');
        const previousTodayPercent = info.existingTodayPercent ? Number(info.existingTodayPercent) : 0;
        const accumulatedWithoutToday = info.totalProgress - previousTodayPercent;

        if (accumulatedWithoutToday + proposedPercent > 100) {
          throw new Error(`Progreso inválido en "${info.name}". Acumulado > 100%.`);
        }

        if (files && files.length > 0) {
          photoUploads.push({ activityId, files });
        }

        const finalPercent = percent !== '' && percent !== undefined ? parseFloat(percent) : (info.existingTodayPercent || 0);
        const finalNotes = notes !== '' && notes !== undefined ? notes : info.existingTodayNotes || null;
        const finalRestriction = hasRestriction !== undefined ? hasRestriction : info.existingTodayRestriction || false;
        const finalReason = restrictionReason !== '' && restrictionReason !== undefined ? restrictionReason : info.existingTodayRestrictionReason || null;

        batchRecords.push({
          activity_id: activityId,
          date: selectedDate,
          progress_percent: finalPercent,
          notes: finalNotes,
          created_by: user?.id,
          photo_urls: info.existingTodayPhotos || [],
          has_restriction: finalRestriction,
          restriction_reason: finalReason
        });
      }

      // Phase 1: Upload Photos
      for (const upload of photoUploads) {
        const record = batchRecords.find(r => r.activity_id === upload.activityId);
        if (!record) continue;

        const photoUrls: string[] = [];
        for (const file of upload.files) {
          const compressedFile = await compressImage(file);
          const fileName = `${projectId}/${upload.activityId}/${selectedDate}_${Math.random().toString(36).substring(7)}.webp`;
          const { error: uploadError, data } = await supabase.storage
            .from('evidence')
            .upload(fileName, compressedFile);

          if (!uploadError && data?.path) {
            const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
            photoUrls.push(publicUrlData.publicUrl);
          }
        }
        record.photo_urls = [...record.photo_urls, ...photoUrls];
      }

      // Phase 2: Massive Batch Upsert
      const { error: batchError } = await supabase
        .from('daily_progress')
        .upsert(batchRecords, { onConflict: 'activity_id,date' });

      if (batchError) {
        if (batchError.message.includes('photo_urls') || batchError.details?.includes('photo_urls')) {
          const recordsWithoutPhotos = batchRecords.map(({ photo_urls, ...rest }) => rest);
          const { error: fallbackError } = await supabase
            .from('daily_progress')
            .upsert(recordsWithoutPhotos, { onConflict: 'activity_id,date' });
          
          if (fallbackError) throw fallbackError;
          setError('Los avances se guardaron pero las fotos no pudieron almacenarse (Error de esquema).');
        } else {
          throw batchError;
        }
      }

      onSaveSuccess();
      triggerProjectAlerts(projectId).catch(console.error);
      router.refresh();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los avances.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return { handleSaveAll, loading, error, setError };
}
