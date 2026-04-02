import { format, addDays, subDays } from 'date-fns';

function parseSafeDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    // Si no tiene hora, le agregamos el mediodía para evitar problemas de timezone por ser UTC
    const str = dateInput.includes('T') ? dateInput : `${dateInput}T12:00:00`;
    return new Date(str);
  }
  return new Date(dateInput);
}

/**
 * Convierte una fecha de base de datos (inclusiva) a una fecha exclusiva para el entorno del Gantt.
 */
export function toGanttEndDate(dbDate: string | Date): string {
  if (!dbDate) return '';
  const dateObj = parseSafeDate(dbDate);
  if (isNaN(dateObj.getTime())) return typeof dbDate === 'string' ? dbDate : '';
  return format(addDays(dateObj, 1), 'yyyy-MM-dd');
}

/**
 * Convierte una fecha del entorno Gantt (exclusiva) a una fecha inclusiva para la base de datos.
 */
export function toDbEndDate(ganttDate: string | Date): string {
  if (!ganttDate) return '';
  const dateObj = parseSafeDate(ganttDate);
  if (isNaN(dateObj.getTime())) return typeof ganttDate === 'string' ? ganttDate : '';
  return format(subDays(dateObj, 1), 'yyyy-MM-dd');
}

/**
 * Estandariza la visualización de una fecha a 'YYYY-MM-DD'.
 */
export function formatTaskDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const dateObj = parseSafeDate(date);
  if (isNaN(dateObj.getTime())) return '';
  return format(dateObj, 'yyyy-MM-dd');
}
