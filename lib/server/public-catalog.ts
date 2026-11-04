import "server-only";
import { readCatalog } from "./catalog";

// Read the same current catalog used by the admin on every request.
export const getCatalog = readCatalog;
