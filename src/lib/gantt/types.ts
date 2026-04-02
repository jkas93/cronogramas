export type GanttDbType = 'partida' | 'item' | 'activity';

export interface GanttTaskData {
  id: string;
  text: string;
  start_date: string | null;
  end_date?: string | null;
  duration?: number;
  open?: boolean;
  parent?: string;
  db_type: GanttDbType;
  db_id: string;
  color?: string;
  textColor?: string;
  progress?: number;
  progressColor?: string;
  weight?: number;
  [key: string]: any; // dhtmlx-gantt add its own props
}

export interface EditPanelState {
  open: boolean;
  taskId: string;
  dbType: GanttDbType | null;
  name: string;
  startDate: string;
  endDate: string;
  weight: string;
  progress: number;
  saving: boolean;
}

export type ZoomLevel = 'day' | 'week' | 'month';
