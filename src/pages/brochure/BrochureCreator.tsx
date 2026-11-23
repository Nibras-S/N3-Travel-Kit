// src/features/brochure/BrochureCreator.tsx
import { useState, useRef, useEffect } from "react";
import { Button, Box, Group } from "@mantine/core";
import { Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Layout from "../../components/Layout";
import { useNavigation } from "../../NavigationContext";
import type { BrochureData, BrochureImages } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { BrochurePreview } from "./components/BrochurePreview";
import { fetchImagesForBrochure } from "./imageService";

const BrochureCreator = () => {
  const { navigateHome } = useNavigation();
  const [brochureData, setBrochureData] = useState<BrochureData | null>(null);
  const [images, setImages] = useState<BrochureImages>({});
  const printRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the latest images so the effect doesn't re-trigger on image changes
  const imagesRef = useRef<BrochureImages>(images);
  imagesRef.current = images;

  // Auto-fetch images from Wikipedia/Wikimedia when brochure data arrives or changes
  useEffect(() => {
    if (!brochureData) return;
    let cancelled = false;

    fetchImagesForBrochure(brochureData, imagesRef.current).then((merged) => {
      if (!cancelled) setImages(merged);
    });

    return () => {
      cancelled = true;
    };
  }, [brochureData]);

  const reactToPrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: brochureData
      ? `${brochureData.packageTitle.replace(/\s+/g, "_")}_Brochure`
      : "N3TravelKit_Tour_Brochure",
    onBeforePrint: async () => {
      // Use the final loaded font metrics and fitted text in the print clone.
      await document.fonts.ready;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    },
    pageStyle: `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      @page {
        size: 1200px 697px;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .brochure-page {
          width: 1200px !important;
          height: 697px !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .brochure-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        .brochure-no-print {
          display: none !important;
        }
      }
    `,
  });

  const handleImageUpload = (slotId: string, dataUrl: string) => {
    setImages((prev) => ({ ...prev, [slotId]: dataUrl }));
  };

  const handleImageRemove = (slotId: string) => {
    setImages((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  return (
    <Layout
      title="Tour Brochure Creator"
      onNavigateHome={navigateHome}
      withBottomBorder
      actions={
        <Group gap="sm">
          <Button
            radius="md"
            leftSection={<Download size={15} />}
            onClick={() => reactToPrintFn()}
            size="sm"
            disabled={!brochureData}
            style={{
              background: brochureData ? "#0f172a" : "#e2e8f0",
              color: brochureData ? "#ffffff" : "#94a3b8",
              fontWeight: 600,
              padding: "0 18px",
              boxShadow: brochureData
                ? "0 4px 12px rgba(15, 23, 42, 0.15)"
                : "none",
              transition: "all 0.2s ease",
            }}
          >
            Export PDF
          </Button>
        </Group>
      }
    >
      {/* Load Editorial Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(380px, 440px) 1fr",
          flex: 1,
          minHeight: 0,
          height: "100%",
          background: "#f8fafc",
        }}
      >
        {/* Left Panel — Chat Studio */}
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            boxShadow: "4px 0 24px rgba(15, 23, 42, 0.02)",
            zIndex: 2,
          }}
        >
          <ChatPanel
            currentBrochureData={brochureData}
            onBrochureGenerated={setBrochureData}
          />
        </Box>

        {/* Right Panel — Architectural Canvas Preview */}
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#f1f5f9",
            backgroundImage:
              "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <BrochurePreview
            data={brochureData}
            images={images}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            onUpdateData={setBrochureData}
            printRef={printRef}
          />
        </Box>
      </Box>
    </Layout>
  );
};

export default BrochureCreator;