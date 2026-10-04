import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns a failed API call into a message for the user. The backend sends a
 * plain-text body for 400/409/422/502 (see ApiExceptionHandler).
 */
export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  const detail = typeof error.error === 'string' && error.error.trim() ? error.error.trim() : null;
  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor de EasyMK.';
    case 400:
      return detail ? `Solicitud inválida: ${detail}` : 'Revisa los datos e inténtalo de nuevo.';
    case 401:
      return 'Tu sesión expiró o las credenciales no son válidas.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 404:
      return 'El recurso solicitado no existe.';
    case 409:
      return detail ? `No se puede completar: ${detail}` : 'La acción ya no es válida para el estado actual.';
    case 422:
      return detail ? `Walmart rechazó las credenciales: ${detail}` : 'Walmart rechazó las credenciales.';
    case 502:
      return detail ? `Error al comunicarse con Walmart: ${detail}` : 'Error al comunicarse con Walmart.';
    default:
      return detail ?? fallback;
  }
}

/** Offers a downloaded document to the user as a file. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** File extension for the label document types the backend returns. */
export function extensionFor(contentType: string | null): string {
  if (!contentType) {
    return 'bin';
  }
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('zip')) return 'zip';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('zpl') || contentType.includes('text')) return 'txt';
  return 'bin';
}
