export const performanceLoggingEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.REACT_APP_PERF_LOGS === "1";

export const perfNow = () => performance.now();

export function createPerfId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logFrontendPerf(
  operation: string,
  durationMs: number,
  metrics: Record<string, number | string | boolean | undefined> = {},
  perfId?: string,
  category = "FRONTEND",
) {
  if (!performanceLoggingEnabled) return;
  console.info(`[PERF][${category}]`, {
    operation,
    durationMs: Number(durationMs.toFixed(2)),
    ...(perfId ? { perfId } : {}),
    ...metrics,
  });
}

type PrintMeasurement = { source: string; startedAt: number; beforePrintAt?: number };
let activePrint: PrintMeasurement | null = null;
let printListenersInstalled = false;

export function printWithPerformance(source: string) {
  if (!performanceLoggingEnabled) {
    window.print();
    return;
  }

  const startedAt = perfNow();
  activePrint = { source, startedAt };
  logFrontendPerf("print-click", 0, { source }, undefined, "PRINT");

  if (!printListenersInstalled) {
    window.addEventListener("beforeprint", () => {
      if (!activePrint) return;
      activePrint.beforePrintAt = perfNow();
      logFrontendPerf("click-to-beforeprint", perfNow() - activePrint.startedAt, {
        source: activePrint.source,
      }, undefined, "PRINT");
    });
    window.addEventListener("afterprint", () => {
      if (!activePrint) return;
      logFrontendPerf("beforeprint-to-afterprint-dialog-lifecycle", perfNow() - (activePrint.beforePrintAt || activePrint.startedAt), {
        source: activePrint.source,
        physicalPrintDurationMeasured: false,
      }, undefined, "PRINT");
      activePrint = null;
    });
    printListenersInstalled = true;
  }

  const callStartedAt = perfNow();
  try {
    window.print();
  } finally {
    logFrontendPerf("window-print-call", perfNow() - callStartedAt, { source }, undefined, "PRINT");
  }
}
