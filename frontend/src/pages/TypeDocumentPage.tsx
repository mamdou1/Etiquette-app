import React from 'react';
import TypeDocumentManager from '../components/TypeDocumentManager';

const TypeDocumentPage: React.FC = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">📄 Types de documents</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Gérez les types de documents et leur attribution aux agences
        </p>
      </div>
      <TypeDocumentManager />
    </div>
  );
};

export default TypeDocumentPage;