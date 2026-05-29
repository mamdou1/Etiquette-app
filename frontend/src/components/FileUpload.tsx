import React, { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

const FileUpload: React.FC<Props> = ({ onFile, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert("Veuillez sélectionner un fichier .xlsx ou .xls");
      return;
    }
    onFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      className={`border-2 border-dashed rounded-none cursor-pointer text-center py-8 px-4 transition-all
        ${drag ? "border-accent bg-accent-light" : "border-border bg-surface hover:border-accent hover:bg-accent-light"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {loading ? (
        <p className="text-sm text-muted font-mono animate-pulse">Lecture en cours…</p>
      ) : (
        <>
          <svg className="mx-auto mb-3 text-muted" width="36" height="36" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p className="text-sm text-muted">
            Glissez un fichier <strong className="text-accent">.xlsx</strong><br/>
            ou cliquez pour parcourir
          </p>
        </>
      )}
    </div>
  );
};

export default FileUpload;
