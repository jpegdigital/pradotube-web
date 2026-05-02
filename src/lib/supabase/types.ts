import type { Database } from "./database.types";

type Schema = Database["pradotube"];

export type Row<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Row"];
export type Insert<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Insert"];
export type Update<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Update"];
