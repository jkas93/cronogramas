import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GanttSidebar } from '@/components/gantt/GanttSidebar';

describe('GanttSidebar', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    taskId: '1',
    dbId: 'db1',
    dbType: 'activity' as const,
    name: 'Test Activity',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    weight: '10',
    progress: 0.5,
    onSave: vi.fn().mockResolvedValue(true),
  };

  it('1. Retorna null si open es false', () => {
    const { container } = render(<GanttSidebar {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Renderiza para partida (oculta fechas)', () => {
    render(<GanttSidebar {...defaultProps} dbType="partida" name="Test Partida" />);
    expect(screen.getByText('Editar Partida')).toBeInTheDocument();
    
    // Debería tener input de Nombre
    expect(screen.getByDisplayValue('Test Partida')).toBeInTheDocument();
    
    // No debería tener labels de fechas ni peso
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
    expect(screen.queryByText('Peso (Curva S)')).not.toBeInTheDocument();
  });

  it('3. Renderiza para activity (muestra todo)', () => {
    render(<GanttSidebar {...defaultProps} />);
    expect(screen.getByText('Detalles de Actividad')).toBeInTheDocument();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Peso (Curva S)')).toBeInTheDocument();
  });

  it('4. Modo readonly deshabilita inputs', () => {
    render(<GanttSidebar {...defaultProps} readonly={true} />);
    const nameInput = screen.getByDisplayValue('Test Activity') as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
  });

  it('5. Modo readonly oculta botón Guardar', () => {
    render(<GanttSidebar {...defaultProps} readonly={true} />);
    expect(screen.queryByText('Guardar Cambios')).not.toBeInTheDocument();
  });

  it('6. Guardar llama onSave con payload de activity', async () => {
    const mockSave = vi.fn().mockResolvedValue(true);
    render(<GanttSidebar {...defaultProps} onSave={mockSave} />);
    
    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('1', 'activity', 'db1', {
        name: 'Test Activity',
        start_date: '2026-03-01',
        end_date: '2026-03-05',
        weight: 10
      });
    });
  });

  it('7. Botón Guardar deshabilitado si nombre vacío', () => {
    render(<GanttSidebar {...defaultProps} name="" />);
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('8. onClose al clickear overlay', () => {
    const mockClose = vi.fn();
    render(<GanttSidebar {...defaultProps} onClose={mockClose} />);
    
    const overlay = document.querySelector('.backdrop-blur-\\[2px\\]') as HTMLElement;
    fireEvent.click(overlay);
    
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
