// A crop's botanical plate: a small painting of the plant with its seed or pod, on its own paper.
// Used where there is room to see it (the three harvests, the advice, the last-crop question). Inside a sentence the
// crop keeps its line icon (CropName), because a painting at text size is only a smudge.
// The plates were made with AI (ChatGPT image generation) from a written brief, and are not photographs. Each file
// carries a visible "AI" badge (the project's rule: no AI-generated image without a visible watermark).
// Written with AI assistance (Claude, Anthropic).
import type { CropId } from "../data/types";

/** Where a crop's plate is served from: the small file for icons, the large one for the advice. */
export function plateUrl(crop: CropId, big = false): string {
  return `${import.meta.env.BASE_URL}crops/${crop}${big ? "" : "-sm"}.webp`;
}

export function CropPlate({
  crop,
  big = false,
  title,
  className = "w-11 h-11",
}: {
  crop: CropId;
  /** The 320 px file, for a plate shown larger than about 60 px. */
  big?: boolean;
  /** The crop's name, when the plate stands alone; leave it out when the name is written beside it. */
  title?: string;
  className?: string;
}) {
  return (
    <img
      src={plateUrl(crop, big)}
      alt={title ?? ""}
      title={title}
      aria-hidden={title ? undefined : true}
      width={big ? 320 : 128}
      height={big ? 320 : 128}
      decoding="async"
      draggable={false}
      data-testid="crop-plate"
      data-crop={crop}
      className={`tc-plate flex-none object-contain ${className}`}
    />
  );
}
