/**
 * imageCompression.ts
 * Utilidad P.U.L.S.O. para optimizar imágenes en el cliente antes de la subida a Supabase.
 * Reduce el peso hasta un 95% convirtiendo a WebP y limitando la resolución.
 */

export async function compressImage(file: File): Promise<File> {
  // Solo procesar si es una imagen
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resolución optimizada para visualización técnica en obra
        const MAX_RESOLUTION = 1200;

        if (width > height) {
          if (width > MAX_RESOLUTION) {
            height *= MAX_RESOLUTION / width;
            width = MAX_RESOLUTION;
          }
        } else {
          if (height > MAX_RESOLUTION) {
            width *= MAX_RESOLUTION / height;
            height = MAX_RESOLUTION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Configuración de suavizado de imagen
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP con calidad balanceada (0.7)
        // WebP ofrece mejor compresión que JPEG manteniendo nitidez
        canvas.toBlob((blob) => {
          if (blob) {
            // Cambiar extensión a .webp para consistencia en el storage
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const compressedFile = new File([blob], newFileName, { type: 'image/webp' });
            resolve(compressedFile);
          } else {
            // Si algo falla, devolvemos el archivo original para no bloquear el flujo
            resolve(file);
          }
        }, 'image/webp', 0.7);
      };
      
      img.onerror = () => {
        // En caso de error de carga de imagen, no bloquear
        resolve(file);
      };
    };
  });
}
