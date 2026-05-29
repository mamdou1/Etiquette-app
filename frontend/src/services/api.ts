import { UploadResponse } from "../types";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

/**
 * Envoie le fichier Excel au backend et retourne les données JSON.
 */
export async function uploadExcel(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || "Erreur lors de l'upload");
  }

  return response.json();
}
