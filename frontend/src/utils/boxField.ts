export function isBoxField(name: string): boolean {
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return /^(?:(?:n|no|num|numero)(?:de)?(?:la)?boite|boite|boxnumber|box|numbox|nobox|numerobox|(?:n|no|num|numero)?chrono)$/.test(key);
}

// Le champ Excel explicite prime sur l'identifiant technique d'un ancien import.
export function resolveBoxNumber(record: Record<string, unknown>, fallback: string): string {
  const values = { ...((record.metaValues as Record<string, unknown>) || {}), ...record };
  const keys = Object.keys(values).filter(isBoxField).sort((a, b) =>
    Number(a === 'numero_boite' || a === 'boxNumber') - Number(b === 'numero_boite' || b === 'boxNumber'));
  for (const key of keys) {
    const raw = values[key];
    const value = raw && typeof raw === 'object' && 'value' in raw ? (raw as { value: unknown }).value : raw;
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
  }
  return fallback;
}
