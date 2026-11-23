import { useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { ImagePlus, X } from "lucide-react";

interface EditorialImageSlotProps {
  slotId: string;
  image?: string;
  onUpload: (slotId: string, dataUrl: string) => void;
  onRemove: (slotId: string) => void;
  caption?: string;
  captionPlacement?: "top" | "bottom" | "none";
  borderRadius?: number | string;
  style?: CSSProperties;
}

export const EditorialImageSlot = ({
  slotId,
  image,
  onUpload,
  onRemove,
  caption,
  captionPlacement = "bottom",
  borderRadius = 2,
  style,
}: EditorialImageSlotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const hasImage = Boolean(image && image !== failedSource);
  const hasCaption = Boolean(caption && captionPlacement !== "none");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onUpload(slotId, reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div
      className={`sb-image ${hasImage ? "sb-image--filled" : "sb-image--empty"}`}
      data-image-slot={slotId}
      style={{ borderRadius, ...style }}
    >
      <input
        ref={inputRef}
        className="brochure-no-print"
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
        aria-label={`Upload ${caption || "tour"} photograph`}
      />

      {hasImage ? (
        <img
          className="sb-image-photo"
          src={image}
          alt={caption || "Tour photograph"}
          onError={() => setFailedSource(image || null)}
        />
      ) : (
        <svg
          className="sb-image-fallback"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Minimal landscape illustration"
        >
          <rect width="600" height="800" fill="var(--sb-card)" />
          <circle cx="435" cy="218" r="81" fill="var(--sb-secondary-soft)" />
          <path d="M-40 600 170 258 353 570 530 368 660 620V840H-40Z" fill="var(--sb-card-border)" />
          <path d="M-40 667Q160 422 340 584T660 512V840H-40Z" fill="var(--sb-primary)" />
          <path d="M-40 754Q165 576 350 706T660 633V840H-40Z" fill="var(--sb-primary-dark)" />
          <path d="M35 671Q180 529 310 616" fill="none" stroke="var(--sb-white)" strokeWidth="1" />
        </svg>
      )}

      {hasCaption && (hasImage || captionPlacement === "bottom") && (
        <div
          className={`sb-image-scrim${captionPlacement === "top" ? " sb-image-scrim--top" : ""}`}
          aria-hidden="true"
        />
      )}
      {hasCaption && (
        <div
          className={`sb-image-caption${captionPlacement === "top" ? " sb-image-caption--top" : ""}`}
        >
          <span className="sb-image-caption-rule" aria-hidden="true" />
          <span>{caption}</span>
        </div>
      )}

      {hasImage ? (
        <div className="sb-image-controls brochure-no-print">
          <button
            type="button"
            title="Replace photograph"
            aria-label={`Replace ${caption || "tour"} photograph`}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Remove photograph"
            aria-label={`Remove ${caption || "tour"} photograph`}
            onClick={() => onRemove(slotId)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="sb-image-upload brochure-no-print"
          onClick={() => inputRef.current?.click()}
          aria-label={`Add ${caption || "tour"} photograph`}
        >
          <span className="sb-upload-chip">
            <ImagePlus size={16} aria-hidden="true" />
            Add a photograph
          </span>
        </button>
      )}
    </div>
  );
};
