// src/features/brochure/components/BrochurePreview.tsx
import { useState, useEffect, useRef } from "react";
import { Box, Text, ScrollArea, ActionIcon, Tooltip, Button } from "@mantine/core";
import { ZoomIn, ZoomOut, Maximize2, Layers, Trash2, Plus } from "lucide-react";
import type { BrochureData, BrochureImages } from "../types";
import { PAGE_WIDTH, PAGE_HEIGHT } from "../types";
import { CoverPage } from "./pages/CoverPage";
import { DayDetailPage } from "./pages/DayDetailPage";
import { InclusionsPage } from "./pages/InclusionsPage";
import { ClosingPage } from "./pages/ClosingPage";

interface BrochurePreviewProps {
  data: BrochureData | null;
  images: BrochureImages;
  onImageUpload: (slotId: string, dataUrl: string) => void;
  onImageRemove: (slotId: string) => void;
  onUpdateData?: (data: BrochureData) => void;
  printRef: React.RefObject<HTMLDivElement | null>;
}

interface PageItem {
  id: string;
  title: string;
  badgeText: string;
  onDelete?: () => void;
  renderScreen: (pageNum: number, total: number) => React.ReactNode;
  renderPrint: (pageNum: number, total: number) => React.ReactNode;
}

export const BrochurePreview = ({
  data,
  images,
  onImageUpload,
  onImageRemove,
  onUpdateData,
  printRef,
}: BrochurePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(0.58);
  const [customZoom, setCustomZoom] = useState<number | null>(null);

  const activeScale = customZoom ?? autoScale;

  // Dynamically calculate scale to fit pages cleanly in preview panel
  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const availW = containerRef.current.clientWidth - 72;
      const s = Math.min(Math.max(availW / PAGE_WIDTH, 0.35), 0.82);
      if (s > 0) setAutoScale(s);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data) {
    return (
      <Box
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <Box
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: "48px 40px",
            maxWidth: 420,
            textAlign: "center",
            boxShadow:
              "0 20px 40px -15px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.02)",
          }}
        >
          <Text
            fw={700}
            size="lg"
            c="#0f172a"
            mb={8}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Editorial Brochure Studio
          </Text>
          <Text size="xs" c="#64748b" lh={1.7}>
            Describe your tour itinerary in the assistant panel. Your multi-page
            luxury brochure will render here in real-time with interactive photo
            slots.
          </Text>
        </Box>
      </Box>
    );
  }

  const footerDest =
    data.tags?.[0]?.toUpperCase() ||
    data.destinations?.[0]?.toUpperCase() ||
    "TOUR";

  // Determine optional pages presence
  const hasInclusionsContent =
    data.showInclusions !== false &&
    ((data.inclusions && data.inclusions.length > 0) ||
      (data.exclusions && data.exclusions.length > 0) ||
      (data.bookingTerms && data.bookingTerms.length > 0));

  const hasClosingContent =
    data.showClosing !== false &&
    Boolean(
      data.closing &&
        (data.closing.title || data.closing.body || data.closing.subtitle)
    );

  // Construct dynamic page array based on active content
  const pages: PageItem[] = [];

  // 1. Cover Spread (always Page 1)
  pages.push({
    id: "cover",
    title: "Cover Spread",
    badgeText: "OVERVIEW",
    renderScreen: (_pageNum, total) => (
      <CoverPage
        data={data}
        images={images}
        onImageUpload={onImageUpload}
        onImageRemove={onImageRemove}
        totalPages={total}
      />
    ),
    renderPrint: (_pageNum, total) => (
      <CoverPage
        data={data}
        images={images}
        onImageUpload={() => {}}
        onImageRemove={() => {}}
        totalPages={total}
      />
    ),
  });

  // 2. Day Detail Pages
  (data.days || []).forEach((day, index) => {
    pages.push({
      id: `day-${index}`,
      title: day.title || `Day ${index + 1}`,
      badgeText: (day.dayRange || `DAY ${index + 1}`).toUpperCase(),
      onDelete: onUpdateData
        ? () => {
            const updatedDays = (data.days || []).filter((_, i) => i !== index);
            onUpdateData({ ...data, days: updatedDays });
          }
        : undefined,
      renderScreen: (pageNum, total) => (
        <DayDetailPage
          day={day}
          dayIndex={index}
          pageNumber={pageNum}
          totalPages={total}
          footerDestination={footerDest}
          images={images}
          onImageUpload={onImageUpload}
          onImageRemove={onImageRemove}
        />
      ),
      renderPrint: (pageNum, total) => (
        <DayDetailPage
          day={day}
          dayIndex={index}
          pageNumber={pageNum}
          totalPages={total}
          footerDestination={footerDest}
          images={images}
          onImageUpload={() => {}}
          onImageRemove={() => {}}
        />
      ),
    });
  });

  // 3. Inclusions & Terms Page (only if has content)
  if (hasInclusionsContent) {
    pages.push({
      id: "inclusions",
      title: "Inclusions, Exclusions & Terms",
      badgeText: "ESSENTIALS",
      onDelete: onUpdateData
        ? () => {
            onUpdateData({
              ...data,
              showInclusions: false,
              inclusions: [],
              exclusions: [],
              bookingTerms: [],
            });
          }
        : undefined,
      renderScreen: (pageNum, total) => (
        <InclusionsPage
          data={data}
          pageNumber={pageNum}
          totalPages={total}
        />
      ),
      renderPrint: (pageNum, total) => (
        <InclusionsPage
          data={data}
          pageNumber={pageNum}
          totalPages={total}
        />
      ),
    });
  }

  // 4. Closing Page (only if has content)
  if (hasClosingContent) {
    pages.push({
      id: "closing",
      title: "Closing & Contact",
      badgeText: "FINALE",
      onDelete: onUpdateData
        ? () => {
            onUpdateData({
              ...data,
              showClosing: false,
            });
          }
        : undefined,
      renderScreen: (pageNum, total) => (
        <ClosingPage
          data={data}
          pageNumber={pageNum}
          totalPages={total}
          images={images}
          onImageUpload={onImageUpload}
          onImageRemove={onImageRemove}
        />
      ),
      renderPrint: (pageNum, total) => (
        <ClosingPage
          data={data}
          pageNumber={pageNum}
          totalPages={total}
          images={images}
          onImageUpload={() => {}}
          onImageRemove={() => {}}
        />
      ),
    });
  }

  const totalPages = pages.length;

  return (
    <Box
      ref={containerRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative",
      }}
    >
      {/* Floating Studio Toolbar */}
      <Box
        style={{
          position: "absolute",
          bottom: 24,
          right: 28,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.22)",
          color: "#ffffff",
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            borderRight: "1px solid rgba(255,255,255,0.15)",
            fontSize: 11,
            fontWeight: 600,
            color: "#cbd5e1",
          }}
        >
          <Layers size={13} color="#2dd4bf" />
          <span>{totalPages} Slides</span>
        </Box>

        <Tooltip label="Zoom Out" position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() =>
              setCustomZoom(Math.max(0.35, +(activeScale - 0.08).toFixed(2)))
            }
            style={{ color: "#f8fafc" }}
          >
            <ZoomOut size={15} />
          </ActionIcon>
        </Tooltip>

        <Text
          size="xs"
          fw={600}
          style={{
            minWidth: 44,
            textAlign: "center",
            color: "#ffffff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(activeScale * 100)}%
        </Text>

        <Tooltip label="Zoom In" position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() =>
              setCustomZoom(Math.min(0.95, +(activeScale + 0.08).toFixed(2)))
            }
            style={{ color: "#f8fafc" }}
          >
            <ZoomIn size={15} />
          </ActionIcon>
        </Tooltip>

        {customZoom !== null && (
          <Tooltip label="Fit to Canvas" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="teal"
              size="sm"
              onClick={() => setCustomZoom(null)}
              style={{ color: "#2dd4bf" }}
            >
              <Maximize2 size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Box>

      {/* Pages Scroll Area */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars={false}>
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "36px 28px 96px 28px",
            gap: 36,
          }}
        >
          {/* Hidden Full-Resolution Container for PDF Print */}
          <div
            ref={printRef}
            className="brochure-print-container"
            style={{ width: PAGE_WIDTH }}
          >
            {pages.map((p, idx) => p.renderPrint(idx + 1, totalPages))}
          </div>

          {/* Scaled Live Previews */}
          {pages.map((p, idx) =>
            renderPage(
              p.renderScreen(idx + 1, totalPages),
              activeScale,
              `preview-${p.id}`,
              idx + 1,
              totalPages,
              p.title,
              p.badgeText,
              p.onDelete
            )
          )}

          {/* Restore Pages Banner if optional pages were omitted */}
          {(!hasInclusionsContent || !hasClosingContent) && onUpdateData && (
            <Box
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
                alignItems: "center",
                padding: "16px 20px",
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(8px)",
                border: "1px dashed #cbd5e1",
                maxWidth: PAGE_WIDTH * activeScale,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <Text size="xs" c="#64748b" fw={500}>
                Omitted sections:
              </Text>
              {!hasInclusionsContent && (
                <Button
                  variant="light"
                  color="teal"
                  size="xs"
                  radius="md"
                  leftSection={<Plus size={13} />}
                  onClick={() => {
                    onUpdateData({
                      ...data,
                      showInclusions: true,
                      inclusions: [
                        "Accommodation in 3-star category or deluxe rooms",
                        "Daily breakfast and traditional regional dinners",
                        "All vehicle transfers and dedicated sightseeing bus",
                        "All toll, state permits, and driver allowances",
                        "Professional tour manager throughout",
                      ],
                      exclusions: [
                        "Monument entry tickets and museum permits",
                        "Personal expenses, laundry, tips and room service",
                        "Adventure activities and water sports",
                        "Expenses caused by flight delays or weather changes",
                      ],
                      bookingTerms: [
                        "Advance deposit required to confirm reservations",
                        "Standard cancellation policies apply",
                        "Itinerary route subject to local administration guidelines",
                      ],
                    });
                  }}
                >
                  Restore Inclusions & Terms
                </Button>
              )}
              {!hasClosingContent && (
                <Button
                  variant="light"
                  color="teal"
                  size="xs"
                  radius="md"
                  leftSection={<Plus size={13} />}
                  onClick={() => {
                    onUpdateData({
                      ...data,
                      showClosing: true,
                      closing: {
                        title: "Memories To Cherish Forever",
                        subtitle: "UNTIL WE MEET AGAIN",
                        body: "Let the memories stay with you forever.\nThe landmarks await your return!",
                      },
                    });
                  }}
                >
                  Restore Closing Page
                </Button>
              )}
            </Box>
          )}
        </Box>
      </ScrollArea>

      {/* Screen & Print Styles */}
      <style>{`
        @media screen {
          .brochure-print-container {
            position: absolute !important;
            left: -99999px !important;
            top: -99999px !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        }
        @media print {
          .brochure-print-container {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            opacity: 1 !important;
            display: block !important;
            width: 100% !important;
          }
        }
      `}</style>
    </Box>
  );
};

function renderPage(
  content: React.ReactNode,
  scale: number,
  key: string,
  pageNum: number,
  totalPages: number,
  title: string,
  badgeText: string,
  onDelete?: () => void
) {
  const formattedPage = String(pageNum).padStart(2, "0");
  const formattedTotal = String(totalPages).padStart(2, "0");

  return (
    <Box
      key={key}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Editorial Slide Header Bar */}
      <Box
        style={{
          width: PAGE_WIDTH * scale,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Box
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "#0f172a",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            {formattedPage} / {formattedTotal}
          </Box>
          <Text
            size="xs"
            fw={600}
            c="#1e293b"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </Text>
        </Box>

        <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text
            size="10px"
            fw={700}
            c="#64748b"
            style={{
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {badgeText}
          </Text>

          {onDelete && (
            <Tooltip label={`Remove this page (${title})`} position="top" withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="xs"
                onClick={onDelete}
                style={{
                  color: "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                <Trash2 size={13} />
              </ActionIcon>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Scaled Slide Frame */}
      <Box
        style={{
          width: PAGE_WIDTH * scale,
          height: PAGE_HEIGHT * scale,
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
          borderRadius: 12,
          boxShadow:
            "0 20px 45px -12px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          background: "#ffffff",
          transition: "width 0.2s ease, height 0.2s ease",
        }}
      >
        <Box
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {content}
        </Box>
      </Box>
    </Box>
  );
}
