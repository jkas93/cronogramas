import { Activity, ItemWithActivities, PartidaWithItems } from '@/lib/types';

export interface EnhancedActivity extends Activity {
  totalProgress: number;
  existingTodayPercent: number | null;
  existingTodayNotes: string | null;
  existingTodayPhotos: string[];
  existingTodayRestriction: boolean;
  existingTodayRestrictionReason: string | null;
}

export interface EnhancedItem extends Omit<ItemWithActivities, 'activities'> {
  activities: EnhancedActivity[];
}

export interface EnhancedPartida extends Omit<PartidaWithItems, 'items'> {
  items: EnhancedItem[];
}

export interface EditedValue {
  percent: string;
  notes: string;
  files: File[];
  hasRestriction: boolean;
  restrictionReason: string;
}

export type EditedValues = Record<string, EditedValue>;
