import React, { useMemo } from "react";
import { LabelRecord } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { sourceRows, countValues } from "../utils/qrStatistics";

export default function QrStatisticsPanel({
  records,
  labels = [],
}: {
  records: LabelRecord[];
  labels?: Array<{ name: string; label: string }>;
}) {
  const { qrStatistics: settings, setQrStatistics } = useSettings();
  const sources = useMemo(() => records.map(sourceRows), [records]);
  const rows = useMemo(() => sources.flatMap((rows) => rows || []), [sources]);
  const columns = useMemo(
    () =>
      Array.from(
        new Set([
          ...rows.flatMap((row) => Object.keys(row)),
          ...records.flatMap((record) => Object.keys(record)),
          ...labels.map((label) => label.name),
        ]),
      ).filter((field) => !field.startsWith("_") && field !== "metaValues"),
    [rows, records, labels],
  );
  const options = useMemo(
    () =>
      new Map(
        settings.enabled
          ? settings.columns.map((field) => [
              field,
              countValues(rows, field).map(([value]) => value),
            ])
          : [],
      ),
    [rows, settings.enabled, settings.columns],
  );
  return (
    <section
      className="rounded-xl border border-border bg-white p-4 my-4 space-y-3"
      aria-label="Statistiques dans le QR"
    >
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">
            Colonnes masquées dans le QR
          </h3>
          <p className="text-xs text-muted mt-1">
            Une colonne masquée disparaît des informations générales, des
            correspondances et des statistiques.
          </p>
        </div>
        {!columns.length ? (
          <p className="text-xs text-muted">Aucune colonne disponible.</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {columns.map((field) => (
              <label key={field} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={(settings.hiddenColumns || []).includes(field)}
                  onChange={(event) =>
                    setQrStatistics((current) => ({
                      ...current,
                      hiddenColumns: event.target.checked
                        ? Array.from(
                            new Set([...(current.hiddenColumns || []), field]),
                          )
                        : (current.hiddenColumns || []).filter(
                            (name) => name !== field,
                          ),
                    }))
                  }
                />
                {labels.find((label) => label.name === field)?.label || field}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm">
              Correspondance entre deux champs
            </h3>
            <p className="text-xs text-muted mt-1">
              Associer les valeurs provenant de la même ligne Excel
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Associer deux champs dans le QR"
            checked={settings.pairingEnabled}
            onChange={(event) =>
              setQrStatistics((current) => ({
                ...current,
                pairingEnabled: event.target.checked,
              }))
            }
          />
        </div>
        {settings.pairingEnabled && (
          <>
            {sources.some((rows) => !rows) && (
              <p role="status" className="text-xs text-amber-700">
                Certaines boîtes n’ont pas leurs lignes de dossiers : réimportez
                leur fichier pour créer les correspondances.
              </p>
            )}
            <div className="space-y-3">
              <label className="text-xs text-muted">
                Champ libellé
                <select
                  aria-label="Champ libellé de la correspondance"
                  value={settings.pairingLabelField}
                  onChange={(event) =>
                    setQrStatistics((current) => ({
                      ...current,
                      pairingLabelField: event.target.value,
                      pairingValueFields: current.pairingValueFields.filter(
                        (field) => field !== event.target.value,
                      ),
                    }))
                  }
                  className="ui-field mt-1 w-full"
                >
                  <option value="">Sélectionner un champ</option>
                  {columns.map((field) => (
                    <option key={field} value={field}>
                      {labels.find((label) => label.name === field)?.label ||
                        field}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-xs text-muted">
                  Colonnes associées
                </legend>
                <p className="mb-2 text-xs text-muted">
                  Sélectionnez une ou plusieurs colonnes à afficher pour chaque
                  libellé.
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {columns
                    .filter((field) => field !== settings.pairingLabelField)
                    .map((field) => (
                      <label
                        key={field}
                        className="flex items-start gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          value={field}
                          className="mt-0.5"
                          checked={settings.pairingValueFields.includes(field)}
                          onChange={(event) =>
                            setQrStatistics((current) => ({
                              ...current,
                              pairingValueFields: event.target.checked
                                ? [...current.pairingValueFields, field]
                                : current.pairingValueFields.filter(
                                    (name) => name !== field,
                                  ),
                            }))
                          }
                        />
                        {labels.find((label) => label.name === field)?.label ||
                          field}
                      </label>
                    ))}
                </div>
              </fieldset>
            </div>
            <p className="text-xs text-muted">
              Les autres informations restent dans le QR. Le champ libellé et
              les colonnes associées sont remplacés par leur correspondance
              ligne par ligne.
            </p>
            {settings.pairingLabelField &&
              settings.pairingValueFields.length > 0 && (
                <p className="rounded bg-surface p-2 text-xs font-mono text-muted">
                  Aperçu :{" "}
                  {labels.find(
                    (label) => label.name === settings.pairingLabelField,
                  )?.label || settings.pairingLabelField}{" "}
                  :{" "}
                  {settings.pairingValueFields
                    .map(
                      (field) =>
                        labels.find((label) => label.name === field)?.label ||
                        field,
                    )
                    .join(", ")}
                </p>
              )}
          </>
        )}
      </div>
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted mt-1">
              Compter une catégorie séparément pour chaque client de la boîte
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Ajouter les statistiques groupées au QR"
            checked={settings.groupedEnabled || false}
            onChange={(event) =>
              setQrStatistics((current) => ({
                ...current,
                groupedEnabled: event.target.checked,
              }))
            }
          />
        </div>
        {settings.groupedEnabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted">
              Colonne principale
              <select
                aria-label="Colonne principale des statistiques groupées"
                className="ui-field mt-1 w-full"
                value={settings.groupedPrimaryField || ""}
                onChange={(event) =>
                  setQrStatistics((current) => ({
                    ...current,
                    groupedPrimaryField: event.target.value,
                    groupedSecondaryFields: (
                      current.groupedSecondaryFields || []
                    ).filter((field) => field !== event.target.value),
                    groupedValueField:
                      current.groupedValueField === event.target.value
                        ? ""
                        : current.groupedValueField,
                  }))
                }
              >
                <option value="">Sélectionner</option>
                {columns.map((field) => (
                  <option key={field} value={field}>
                    {labels.find((label) => label.name === field)?.label ||
                      field}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-xs text-muted">
              <legend>Identifiants complémentaires (facultatifs)</legend>
              <details className="relative mt-1">
                <summary className="ui-field cursor-pointer list-none w-full">
                  {(settings.groupedSecondaryFields || []).length
                    ? (settings.groupedSecondaryFields || [])
                        .map(
                          (field) =>
                            labels.find((label) => label.name === field)
                              ?.label || field,
                        )
                        .join(", ")
                    : "Sélectionner une ou plusieurs colonnes"}
                </summary>
                <div className="absolute z-20 mt-1 max-h-52 w-full min-w-52 overflow-y-auto rounded-lg border border-border bg-white p-3 shadow-lg space-y-2">
                  {columns
                    .filter(
                      (field) =>
                        field !== settings.groupedPrimaryField &&
                        field !== settings.groupedValueField,
                    )
                    .map((field) => (
                      <label
                        key={field}
                        className="flex items-start gap-2 text-xs text-foreground"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          aria-label={`Identifiant complémentaire ${field}`}
                          checked={(
                            settings.groupedSecondaryFields || []
                          ).includes(field)}
                          onChange={(event) =>
                            setQrStatistics((current) => ({
                              ...current,
                              groupedSecondaryFields: event.target.checked
                                ? [
                                    ...(current.groupedSecondaryFields || []),
                                    field,
                                  ]
                                : (current.groupedSecondaryFields || []).filter(
                                    (name) => name !== field,
                                  ),
                            }))
                          }
                        />
                        {labels.find((label) => label.name === field)?.label ||
                          field}
                      </label>
                    ))}
                </div>
              </details>
            </fieldset>
            <label className="text-xs text-muted">
              Colonne à compter
              <select
                aria-label="Colonne à compter dans les statistiques groupées"
                className="ui-field mt-1 w-full"
                value={settings.groupedValueField || ""}
                onChange={(event) =>
                  setQrStatistics((current) => ({
                    ...current,
                    groupedValueField: event.target.value,
                    groupedSecondaryFields: (
                      current.groupedSecondaryFields || []
                    ).filter((field) => field !== event.target.value),
                  }))
                }
              >
                <option value="">Sélectionner</option>
                {columns
                  .filter((field) => field !== settings.groupedPrimaryField)
                  .map((field) => (
                    <option key={field} value={field}>
                      {labels.find((label) => label.name === field)?.label ||
                        field}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}
        {settings.groupedEnabled && (
          <p className="text-xs text-muted">
            Le regroupement est recalculé indépendamment pour chaque boîte et ne
            mélange jamais les clients de boîtes différentes.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Statistiques dans le QR</h3>
          <p className="text-xs text-muted mt-1">
            Un récapitulatif pour chaque boîte
          </p>
        </div>
        <input
          type="checkbox"
          role="switch"
          aria-label="Ajouter les statistiques au QR"
          checked={settings.enabled}
          onChange={(event) =>
            setQrStatistics((current) => ({
              ...current,
              enabled: event.target.checked,
            }))
          }
        />
      </div>
      {settings.enabled && (
        <>
          <p className="text-xs text-muted">
            Choisissez les colonnes puis les valeurs à compter. Une cellule =
            une occurrence. Les cellules vides sont regroupées sous « Non
            renseigné ».
          </p>
          {sources.some((rows) => !rows) && (
            <p role="status" className="text-xs text-amber-700">
              Certaines boîtes n’ont pas leurs lignes de dossiers : réimportez
              leur fichier pour obtenir les statistiques.
            </p>
          )}
          {!columns.length && (
            <p className="text-xs text-muted">Aucune colonne disponible.</p>
          )}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {columns.map((field) => {
              const active = settings.columns.includes(field);
              return (
                <div
                  key={field}
                  className="rounded-lg border border-border p-3"
                >
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) =>
                        setQrStatistics((current) => ({
                          ...current,
                          columns: event.target.checked
                            ? [...current.columns, field]
                            : current.columns.filter((name) => name !== field),
                        }))
                      }
                    />
                    {labels.find((label) => label.name === field)?.label ||
                      field}
                  </label>
                  {active && (
                    <div className="mt-2 pl-4 space-y-2">
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setQrStatistics((current) => ({
                              ...current,
                              excluded: { ...current.excluded, [field]: [] },
                            }))
                          }
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQrStatistics((current) => ({
                              ...current,
                              excluded: {
                                ...current.excluded,
                                [field]: options.get(field) || [],
                              },
                            }))
                          }
                        >
                          Tout décocher
                        </button>
                      </div>
                      {(options.get(field) || []).map((value) => (
                        <label
                          key={value}
                          className="flex items-start gap-2 text-xs break-words"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={
                              !(settings.excluded[field] || []).includes(value)
                            }
                            onChange={(event) =>
                              setQrStatistics((current) => ({
                                ...current,
                                excluded: {
                                  ...current.excluded,
                                  [field]: event.target.checked
                                    ? (current.excluded[field] || []).filter(
                                        (item) => item !== value,
                                      )
                                    : [
                                        ...(current.excluded[field] || []),
                                        value,
                                      ],
                                },
                              }))
                            }
                          />
                          {value || "(Non renseigné)"}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            Ces choix s’appliquent aux boîtes de la sélection. Les informations
            d’origine restent dans le QR.
          </p>
        </>
      )}
    </section>
  );
}
