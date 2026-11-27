import { QrStatisticsSettings, defaultQrStatistics } from '../utils/qrStatistics';
import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  ColumnCount,
  LabelSize,
  FontSize,
  FontStyle,
  FieldFilters,
  LabelsPerPage,
  FontFamily,
} from "../types";

interface SettingsContextValue {
  qrStatistics: QrStatisticsSettings;
  setQrStatistics: React.Dispatch<React.SetStateAction<QrStatisticsSettings>>;
  fieldRange: { enabled: boolean; from: string; to: string };
  setFieldRange: (value: { enabled: boolean; from: string; to: string }) => void;
  showQr: boolean;
  setShowQr: (value: boolean) => void;
  valueSpacing: number;
  setValueSpacing: (value: number) => void;
  qrSpacing: number;
  setQrSpacing: (value: number) => void;
  boxPrefix: string;
  setBoxPrefix: (value: string) => void;
  // États
  cols: ColumnCount;
  size: LabelSize;
  fontSize: FontSize;
  fontStyle: FontStyle;
  fontFamily: FontFamily;
  visibleFields: string[];
  filters: FieldFilters;
  labelsPerPage: LabelsPerPage;
  labelLayout: 'auto' | 'row';
  setLabelLayout: (layout: 'auto' | 'row') => void;

  // Actions
  setCols: (cols: ColumnCount) => void;
  setSize: (size: LabelSize) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontStyle: (fontStyle: FontStyle) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setVisibleFields: (fields: string[]) => void;
  setFilters: (filters: FieldFilters) => void;
  setLabelsPerPage: (count: LabelsPerPage) => void;
  updateFilter: (
    field: string,
    key: "value" | "from" | "to",
    value: string,
  ) => void;
  clearFilters: () => void;
  toggleField: (key: string) => void;
  reorderFields: (startIndex: number, endIndex: number) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

const DEFAULT_FONT_SIZE: FontSize = {
  labelSize: 14,
  valueSize: 18,
  qrSize: 220,
  agenceSize: 32,
};

const DEFAULT_FONT_STYLE: FontStyle = {
  labelWeight: "semibold",
  valueWeight: "bold",
  labelItalic: false,
  valueItalic: false,
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [qrStatistics, setQrStatistics] = useState(defaultQrStatistics);
  const [cols, setCols] = useState<ColumnCount>(2);
  const [size, setSize] = useState<LabelSize>("md");
  const [fontSize, setFontSize] = useState<FontSize>(DEFAULT_FONT_SIZE);
  const [fontStyle, setFontStyle] = useState<FontStyle>(DEFAULT_FONT_STYLE);
  const [fontFamily, setFontFamily] = useState<FontFamily>("Arial");
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FieldFilters>({});
  const [labelsPerPage, setLabelsPerPage] = useState<LabelsPerPage>(2);
  const [labelLayout, setLabelLayout] = useState<'auto' | 'row'>('auto');
  const [showQr, setShowQr] = useState(true);
  const [valueSpacing, setValueSpacing] = useState(0);
  const [qrSpacing, setQrSpacing] = useState(12);
  const [boxPrefix, setBoxPrefix] = useState('Boîte N°');
  const [fieldRange, setFieldRange] = useState({ enabled: false, from: '', to: '' });

  const updateFilter = (
    field: string,
    key: "value" | "from" | "to",
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value,
      },
    }));
  };

  const clearFilters = () => setFilters({});

  const toggleField = (key: string) => {
    setVisibleFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const reorderFields = (startIndex: number, endIndex: number) => {
    setVisibleFields((prev) => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, removed);
      return newOrder;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        qrStatistics, setQrStatistics,
        fieldRange, setFieldRange,
        showQr, setShowQr,
        valueSpacing, setValueSpacing,
        qrSpacing, setQrSpacing,
        boxPrefix, setBoxPrefix,
        cols,
        size,
        fontSize,
        fontStyle,
        fontFamily,
        visibleFields,
        filters,
        labelsPerPage,
        labelLayout,
        setLabelLayout,
        setCols,
        setSize,
        setFontSize,
        setFontStyle,
        setFontFamily,
        setVisibleFields,
        setFilters,
        setLabelsPerPage,
        updateFilter,
        clearFilters,
        toggleField,
        reorderFields,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
