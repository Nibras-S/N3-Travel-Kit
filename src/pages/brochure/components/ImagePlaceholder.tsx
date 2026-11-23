import { useRef, useState } from "react";
import { Box } from "@mantine/core";
import { Camera, RefreshCw, Trash2 } from "lucide-react";

interface ImagePlaceholderProps {
  slotId: string;
  imageUrl?: string;
  onUpload: (slotId: string, dataUrl: string) => void;
  onRemove: (slotId: string) => void;
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  caption?: string;
}

export const ImagePlaceholder = ({
  slotId,
  imageUrl,
  onUpload,
  onRemove,
  width = "100%",
  height = "100%",
  borderRadius = 8,
  caption,
}: ImagePlaceholderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenPicker = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(slotId, reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(slotId);
  };

  return (
    <Box
      style={{
        width,
        height,
        position: "relative",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Main Container */}
      <Box
        onClick={handleOpenPicker}
        style={{
          width: "100%",
          flex: 1,
          borderRadius,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          border: imageUrl ? "none" : "2px dashed #cbd5e1",
          background: imageUrl ? "#000000" : isHovered ? "#f0fdf4" : "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
      >
        {imageUrl ? (
          <>
            {/* Rendered Image */}
            <img
              src={imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius,
                display: "block",
                transition: "opacity 0.2s ease",
                opacity: isHovered ? 0.88 : 1,
              }}
            />

            {/* Hover Actions Bar (Change & Remove) - Hidden during print */}
            <Box
              className="brochure-no-print"
              style={{
                position: "absolute",
                inset: 0,
                background: isHovered ? "rgba(0,0,0,0.35)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                transition: "all 0.2s ease",
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? "auto" : "none",
              }}
            >
              {/* Change Image Button */}
              <button
                type="button"
                onClick={handleOpenPicker}
                title="Change Image"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "none",
                  borderRadius: 24,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                  (e.currentTarget as HTMLElement).style.background = "#2ecc71";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLElement).style.background = "#ffffff";
                  (e.currentTarget as HTMLElement).style.color = "#0f172a";
                }}
              >
                <RefreshCw size={16} />
                <span>Change Image</span>
              </button>

              {/* Remove Image Button */}
              <button
                type="button"
                onClick={handleRemove}
                title="Remove Image"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239, 68, 68, 0.95)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 24,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                  (e.currentTarget as HTMLElement).style.background = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.95)";
                }}
              >
                <Trash2 size={16} />
                <span>Remove</span>
              </button>
            </Box>

            {/* Persistent Small Change Icon on top-right for instant discovery */}
            <Box
              className="brochure-no-print"
              onClick={handleOpenPicker}
              title="Click to change image"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.65)",
                color: "#ffffff",
                borderRadius: 16,
                padding: "5px 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                backdropFilter: "blur(4px)",
                cursor: "pointer",
                zIndex: 2,
                opacity: isHovered ? 0 : 0.85,
                transition: "opacity 0.2s ease",
              }}
            >
              <RefreshCw size={12} />
              <span>Change</span>
            </Box>
          </>
        ) : (
          /* Empty Placeholder */
          <Box
            className="brochure-no-print"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: isHovered ? "#dcfce7" : "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s ease",
              }}
            >
              <Camera size={22} color={isHovered ? "#16a34a" : "#64748b"} />
            </Box>
            <div
              style={{
                fontSize: 12,
                color: isHovered ? "#16a34a" : "#64748b",
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                marginTop: 2,
              }}
            >
              Click to upload photo
            </div>
          </Box>
        )}
      </Box>

      {/* Caption (if present) */}
      {caption && (
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginTop: 6,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {caption}
        </div>
      )}
    </Box>
  );
};
