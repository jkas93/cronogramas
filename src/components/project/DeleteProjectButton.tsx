'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    const userInput = window.prompt(
      `Estás a punto de borrar el proyecto "${projectName}" y TODO su contenido para siempre.\n\nEscribe la palabra "ELIMINAR" (en mayúsculas) para confirmar la operación:`
    );

    if (userInput !== 'ELIMINAR') {
      if (userInput !== null) {
         window.alert('Operación cancelada: La palabra de seguridad no coincide.');
      }
      return;
    }

    try {
      setIsDeleting(true);
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      
      if (error) {
        console.error("Error al eliminar el proyecto:", error);
        window.alert('Hubo un error de base de datos al eliminar el proyecto. Asegúrate de tener permisos de administrador.');
        setIsDeleting(false);
        return;
      }
      
      // Navigate to dashboard
      window.alert("Proyecto eliminado exitosamente.");
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert("Ocurrió un error inesperado conectando con el servidor.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`btn-danger text-xs flex items-center gap-2 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="Borrar proyecto definitivamente"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
      {isDeleting ? 'Borrando...' : 'Borrar Proyecto'}
    </button>
  );
}
