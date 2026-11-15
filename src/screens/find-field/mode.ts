// What step 1 (find your field) is doing at a given moment, and the helpers that start each mode.
// Written with AI assistance (Claude, Anthropic).
import type { LngLat } from "../../data/types";

export type Mode =
  | { k: "idle" }
  | { k: "demo" }
  /** Looking for the field's edges in the photo around a tap, before drawing. */
  | { k: "finding" }
  /** Typing the sheet and parcel numbers from the farm file. `state` says how the last search went. */
  | { k: "parcel"; sheet: string; parcel: string; state: "typing" | "searching" | "noSheet" | "noParcel" | "failed" }
  /**
   * Drawing the field: tap corners, pull dots, trace with one finger, or let the app find the edges.
   * `past` holds earlier shapes for Undo. `seeking`: the next tap is a point inside the field, not a corner.
   * `finding`: waiting for the edges found in the photo. `note` is a one-line message after something did not work.
   */
  | {
      k: "drawing";
      ring: LngLat[];
      past: LngLat[][];
      tracing: boolean;
      seeking: boolean;
      finding: boolean;
      note: Note;
    };
export type Note = "tooSmall" | "max" | "noEdges" | null;

export type ParcelMode = Extract<Mode, { k: "parcel" }>;
export type DrawingMode = Extract<Mode, { k: "drawing" }>;

export const startDrawing = (ring: LngLat[] = [], past: LngLat[][] = [], note: Note = null): Mode => ({
  k: "drawing",
  ring,
  past,
  tracing: false,
  seeking: false,
  finding: false,
  note,
});

export const NOTE_KEY = { max: "find.maxCorners", tooSmall: "find.tooSmall", noEdges: "find.noEdges" } as const;
export const startParcel = (): Mode => ({ k: "parcel", sheet: "", parcel: "", state: "typing" });
export const PARCEL_NOTE = { noSheet: "parcel.noSheet", noParcel: "parcel.noParcel", failed: "parcel.failed" } as const;
