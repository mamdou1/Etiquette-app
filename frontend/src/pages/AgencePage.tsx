import React from "react";
import AgenceManager from "../components/AgenceManager";

const AgencePage: React.FC = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🏢 Gestion des Agences</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Gérez les agences qui seront utilisées pour l'enrichissement des données
        </p>
      </div>
      <AgenceManager />
    </div>
  );
};

export default AgencePage;