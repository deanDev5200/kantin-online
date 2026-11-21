type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, event: string, context?: Record<string, unknown>) {
  // Only emit in development to keep server logs quiet in the built app.
  // A production deployment could route this to a log sink later.
  if (process.env.NODE_ENV === "production" && level === "debug") return;

  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(context ?? {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, context?: Record<string, unknown>) => emit("debug", event, context),
  info: (event: string, context?: Record<string, unknown>) => emit("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => emit("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => emit("error", event, context),
};
