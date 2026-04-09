import "server-only";

export type DataBackend = "json" | "prisma";

export function getDataBackend(): DataBackend {
  return process.env.DATA_BACKEND === "prisma" ? "prisma" : "json";
}
