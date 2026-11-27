import type { AgenceResult } from '../services/searchService';

// Découper les boîtes dans l'ordre de la recherche, puis conserver leur hiérarchie.
export function paginateSearchResults(results: AgenceResult[], page: number, pageSize: number) {
  const total = results.reduce((sum, agence) => sum + agence.types.reduce(
    (typeSum, type) => typeSum + type.annees.reduce(
      (yearSum, year) => yearSum + year.boites.length, 0), 0), 0);
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const offset = (currentPage - 1) * pageSize;
  let cursor = 0;

  const paginatedResults = results.map(agence => ({
    ...agence,
    types: agence.types.map(type => ({
      ...type,
      annees: type.annees.map(year => {
        const start = Math.max(0, offset - cursor);
        const end = Math.max(0, Math.min(year.boites.length, offset + pageSize - cursor));
        cursor += year.boites.length;
        return { ...year, boites: year.boites.slice(start, end) };
      }).filter(year => year.boites.length > 0),
    })).filter(type => type.annees.length > 0),
  })).filter(agence => agence.types.length > 0);

  return {
    paginatedResults,
    total,
    totalPages,
    currentPage,
    firstItem: total > 0 ? offset + 1 : 0,
    lastItem: Math.min(offset + pageSize, total),
  };
}
