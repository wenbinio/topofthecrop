import type { FieldBundle } from "./types";

/**
 * Checks a parsed JSON value against the data contract and returns it typed.
 * Throws `Error("bundle: <what is wrong>")` on the first problem found.
 */
export function validateBundle(_json: unknown): FieldBundle {
  throw new Error("not implemented");
}

/**
 * Fetches `${import.meta.env.BASE_URL}data/<fieldId>.json` and validates it.
 * Rejects with an Error if the file is missing, is not JSON, or fails validation.
 */
export async function loadBundle(_fieldId: string): Promise<FieldBundle> {
  throw new Error("not implemented");
}
