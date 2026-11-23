import { useRef, useState } from "react";
import {
  Button,
  TextInput,
  NumberInput,
  Paper,
  Text,
  Group,
  Stack,
  ActionIcon,
  Box,
  SimpleGrid,
  ScrollArea,
  FileInput,
  Select,
  SegmentedControl,
  UnstyledButton,
  Divider,
  Accordion,
} from "@mantine/core";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  LayoutGrid,
  List,
  Check,
} from "lucide-react";
import { IconLuggage } from "@tabler/icons-react";
import { toPng } from "html-to-image";
import Layout from "../../components/Layout";
import { useNavigation } from "../../NavigationContext";
import { ScaledPosterPreview } from "../../components/ScaledPosterPreview";
import classes from "./FlightPosterGenerator.module.css";
import { PosterFooter } from "../../components/PosterFooter";
import { PosterContactForm } from "../../components/PosterContactForm";
import { usePosterContact } from "../../components/usePosterContact";

interface FlightDate {
  day: string;
  month: string;
}

interface FlightCard {
  id: number;
  from: string;
  to: string;
  connectingDetails: string[];
  luggage: string;
  dates: FlightDate[];
  logoFile: File | null;
  logoUrl: string;
  logoType: string;
  price: number | string;
  priceLabel: string;
}

const LOGO_OPTIONS = [
  { value: "airarabia.svg", label: "Air Arabia" },
  { value: "airindia.svg", label: "Air India Express" },
  { value: "fludubai.svg", label: "Fly Dubai" },
  { value: "flynas.svg", label: "Flynas" },
  { value: "indigo.svg", label: "Indigo" },
  { value: "saudia.svg", label: "Saudia" },
  { value: "spacejet.svg", label: "SpiceJet" },
  { value: "other", label: "Other (Upload)" },
];

const HEADER_BANNER_OPTIONS = [
  { value: "/headerbanner/banner1.svg", label: "Banner 1" },
  { value: "/headerbanner/banner2.svg", label: "Banner 2" },
  { value: "/headerbanner/banner3.svg", label: "Banner 3" },
  { value: "/headerbanner/banner4.svg", label: "Banner 4" },
  { value: "/headerbanner/banner5.svg", label: "Banner 5" },
  { value: "/headerbanner/banner9.svg", label: "Banner 6" },
  { value: "/headerbanner/banner10.svg", label: "Banner 7" },
  { value: "/headerbanner/banner11.svg", label: "Banner 8" },
  { value: "/headerbanner/banner12.svg", label: "Banner 9" },
];

const PRESET_BG_IMAGES = [
  {
    label: "Wing over Clouds (Aesthetic)",
    url: "https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Airplane Wing Sunset",
    url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Window View Light",
    url: "https://images.unsplash.com/photo-1530469641172-8ac15d0a7d6a?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Airplane in Flight",
    url: "https://images.unsplash.com/photo-1572204443432-a427ee039e73?q=80&w=1200&auto=format&fit=crop",
  },
];

const createEmptyCard = (id: number): FlightCard => ({
  id,
  from: "Calicut",
  to: "Sharjah",
  connectingDetails: ["MCT 08:30 -> FJR 09:25", "MCT 08:30 -> FJR 09:25"],
  luggage: "30 + 7 KG",
  dates: [
    { day: "13", month: "MAR" },
    { day: "15", month: "MAR" },
  ],
  logoFile: null,
  logoUrl: "/airlinelogos/airindia.svg",
  logoType: "airindia.svg",
  price: 12000,
  priceLabel: "One Way for Traveler",
});

// Helper to format price cleanly with Indian comma separation
const formatPrice = (price: number | string) => {
  if (price === "" || price === null || price === undefined) return "";
  const num = Number(price);
  return isNaN(num) ? `₹${price}` : `₹${num.toLocaleString("en-IN")}`;
};

// Helper to ensure text is always in Title Case
const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (char) => char.toUpperCase());
};

// Custom Flight SVG Icon
const CustomFlightIcon = ({
  size = 22,
  color = "currentColor",
  style = {},
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    style={{ display: "inline-block", verticalAlign: "middle", ...style }}
  >
    <path
      fill={color}
      d="M15.396,3.197 C16.549,2.265 17.838,2.237 18.975,2.253 C19.011,2.253 19.047,2.254 19.083,2.254 C19.56,2.26 19.985,2.265 20.351,2.407 C20.92,2.628 21.373,3.08 21.594,3.65 C21.735,4.015 21.74,4.44 21.746,4.917 C21.747,4.953 21.747,4.989 21.748,5.025 C21.764,6.162 21.735,7.451 20.803,8.605 C20.455,9.036 19.998,9.371 19.634,9.637 C19.59,9.669 19.548,9.7 19.507,9.73 C19.088,10.041 18.802,10.281 18.626,10.571 C18.417,10.917 18.482,11.268 18.672,12.043 L19.951,17.289 C20.098,17.888 20.134,18.455 19.98,19.008 C19.827,19.562 19.506,20.02 19.083,20.443 C18.84,20.686 18.445,20.984 17.927,20.925 C17.41,20.867 17.084,20.488 16.89,20.178 L13.473,14.734 L12.285,15.678 C11.558,16.256 11.402,16.404 11.318,16.582 C11.191,16.852 11.146,17.25 11.161,17.785 C11.168,18.039 11.187,18.298 11.207,18.567 L11.208,18.581 C11.228,18.847 11.249,19.131 11.252,19.394 C11.258,19.827 11.092,20.351 10.849,20.765 C10.623,21.15 10.169,21.709 9.455,21.748 C8.875,21.78 8.526,21.416 8.356,21.155 C8.235,20.97 8.134,20.72 8.089,20.607 C8.08,20.585 8.073,20.568 8.068,20.558 L6.836,17.757 C6.759,17.581 6.715,17.483 6.677,17.412 C6.66,17.38 6.649,17.363 6.644,17.356 C6.637,17.351 6.621,17.34 6.588,17.323 C6.517,17.286 6.419,17.241 6.244,17.164 L3.442,15.932 C3.432,15.927 3.415,15.921 3.393,15.912 C3.281,15.866 3.03,15.765 2.846,15.645 C2.584,15.474 2.22,15.125 2.252,14.545 C2.291,13.831 2.85,13.377 3.235,13.152 C3.65,12.908 4.173,12.742 4.606,12.748 C4.87,12.752 5.153,12.773 5.419,12.792 L5.433,12.793 C5.703,12.813 5.961,12.832 6.215,12.839 C6.75,12.854 7.148,12.809 7.419,12.682 C7.596,12.599 7.744,12.442 8.322,11.715 L9.266,10.527 L3.822,7.11 C3.513,6.916 3.133,6.59 3.075,6.073 C3.016,5.556 3.314,5.16 3.557,4.917 C3.98,4.494 4.438,4.174 4.992,4.02 C5.545,3.867 6.112,3.902 6.712,4.049 L11.957,5.329 C12.733,5.518 13.084,5.583 13.43,5.374 C13.719,5.199 13.96,4.912 14.27,4.493 C14.3,4.452 14.331,4.41 14.363,4.366 C14.63,4.002 14.964,3.546 15.396,3.197 Z M18.954,3.752 C17.824,3.737 17.037,3.799 16.338,4.364 C16.068,4.582 15.852,4.876 15.564,5.266 C15.535,5.305 15.506,5.344 15.476,5.385 C15.172,5.796 14.778,6.311 14.207,6.657 C13.296,7.208 12.349,6.972 11.719,6.815 C11.678,6.805 11.639,6.795 11.601,6.786 L6.356,5.506 C5.91,5.397 5.619,5.403 5.393,5.465 C5.19,5.522 4.973,5.643 4.705,5.893 L10.774,9.702 C10.955,9.816 11.078,10.001 11.115,10.211 C11.151,10.422 11.095,10.637 10.962,10.804 L9.496,12.649 C9.468,12.684 9.44,12.72 9.412,12.755 C8.965,13.319 8.593,13.788 8.056,14.04 C7.451,14.324 6.753,14.355 6.173,14.339 C5.884,14.33 5.596,14.309 5.336,14.29 L5.309,14.288 C5.034,14.268 4.796,14.251 4.585,14.248 C4.553,14.247 4.469,14.256 4.346,14.293 C4.228,14.328 4.104,14.381 3.994,14.446 C3.962,14.464 3.933,14.483 3.908,14.501 L3.912,14.503 L3.914,14.503 C3.953,14.519 4,14.539 4.046,14.559 L6.848,15.791 C6.867,15.8 6.887,15.809 6.907,15.817 C7.177,15.935 7.476,16.066 7.705,16.295 C7.934,16.524 8.065,16.823 8.183,17.094 C8.192,17.114 8.2,17.133 8.209,17.153 L9.441,19.954 C9.462,20 9.481,20.048 9.497,20.086 L9.498,20.088 L9.5,20.093 C9.518,20.067 9.536,20.038 9.555,20.007 C9.619,19.897 9.672,19.772 9.707,19.655 C9.745,19.531 9.753,19.447 9.752,19.415 C9.749,19.204 9.733,18.967 9.712,18.691 L9.71,18.664 C9.691,18.404 9.67,18.116 9.662,17.827 C9.646,17.248 9.676,16.55 9.96,15.944 C10.213,15.407 10.682,15.035 11.246,14.588 C11.281,14.561 11.316,14.533 11.351,14.504 L13.196,13.038 C13.363,12.905 13.579,12.85 13.789,12.886 C14,12.922 14.185,13.046 14.298,13.226 L18.107,19.295 C18.358,19.028 18.479,18.81 18.535,18.607 C18.598,18.381 18.603,18.09 18.494,17.644 L17.214,12.399 C17.205,12.361 17.195,12.322 17.185,12.282 C17.028,11.651 16.792,10.704 17.343,9.794 C17.689,9.222 18.205,8.828 18.615,8.525 C18.656,8.495 18.696,8.465 18.735,8.436 C19.125,8.149 19.418,7.932 19.636,7.662 C20.201,6.963 20.264,6.176 20.248,5.046 C20.239,4.394 20.225,4.27 20.195,4.192 C20.126,4.016 19.985,3.874 19.808,3.805 C19.73,3.775 19.606,3.762 18.954,3.752 Z"
    />
  </svg>
);

const FlightPosterGenerator = () => {
  const [contact, setContact] = usePosterContact();
  const posterRef = useRef<HTMLDivElement>(null);
  const departureInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [cards, setCards] = useState<FlightCard[]>([createEmptyCard(1)]);
  const [openFlightId, setOpenFlightId] = useState<string | null>("1");
  const [cardLayout, setCardLayout] = useState<"list" | "grid">("list");
  const [gridColumns, setGridColumns] = useState<number>(2);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [headerBanner, setHeaderBanner] = useState<string>(
    "/headerbanner/banner1.svg"
  );
  const [singleBgImage, setSingleBgImage] = useState<string>(
    PRESET_BG_IMAGES[0].url
  );

  const handleSingleBgUpload = (file: File | null) => {
    if (file) {
      setSingleBgImage(URL.createObjectURL(file));
    }
  };

  const addCard = () => {
    const newId =
      cards.length > 0 ? Math.max(...cards.map((c) => c.id)) + 1 : 1;
    setCards((prev) => [...prev, createEmptyCard(newId)]);
    setOpenFlightId(String(newId));
    requestAnimationFrame(() => departureInputs.current[newId]?.focus());
  };

  const removeCard = (id: number) => {
    if (cards.length > 1) {
      const remainingCards = cards.filter((card) => card.id !== id);
      setCards(remainingCards);
      if (openFlightId === String(id)) {
        setOpenFlightId(String(remainingCards[0].id));
      }
    }
  };

  const updateCard = (id: number, field: keyof FlightCard, value: unknown) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addConnecting = (cardId: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, connectingDetails: [...c.connectingDetails, ""] }
          : c
      )
    );
  };

  const updateConnecting = (cardId: number, index: number, value: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              connectingDetails: c.connectingDetails.map((d, i) =>
                i === index ? value : d
              ),
            }
          : c
      )
    );
  };

  const removeConnecting = (cardId: number, index: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              connectingDetails: c.connectingDetails.filter(
                (_, i) => i !== index
              ),
            }
          : c
      )
    );
  };

  const addDate = (cardId: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, dates: [...c.dates, { day: "", month: "" }] }
          : c
      )
    );
  };

  const updateDate = (
    cardId: number,
    index: number,
    field: "day" | "month",
    value: string
  ) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              dates: c.dates.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
              ),
            }
          : c
      )
    );
  };

  const removeDate = (cardId: number, index: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, dates: c.dates.filter((_, i) => i !== index) }
          : c
      )
    );
  };

  const handleLogoUpload = (cardId: number, file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, logoFile: file, logoUrl: url } : c
        )
      );
    }
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    try {
      await document.fonts.load("800 44px Geist");
      await document.fonts.load("900 38px Geist");
      await document.fonts.ready;
      const dataUrl = await toPng(posterRef.current, {
        quality: 1,
        pixelRatio: cards.length === 1 ? 1.35 : 3,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download =
        cards.length === 1
          ? `n3travelkit-flight-${(cards[0].from || "flight").toLowerCase()}-${(
              cards[0].to || "poster"
            ).toLowerCase()}.png`
          : "n3travelkit-flight-poster.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
    }
  };

  // ─── Modern Route Progress Graphic (Inspired by Flighty / Apple Wallet UI) ──

  const renderModernRouteGraphic = (compact = false) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: compact ? (gridColumns === 2 ? 86 : 58) : 190,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Origin Glowing Node */}
        <div
          style={{
            width: compact ? 6 : 8,
            height: compact ? 6 : 8,
            borderRadius: "50%",
            backgroundColor: "#10b981",
            boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.18)",
            flexShrink: 0,
          }}
        />

        {/* Completed Gradient Progress Bar */}
        <div
          style={{
            flex: 1.15,
            height: compact ? 3 : 4,
            background: "linear-gradient(90deg, #10b981 0%, #017746 100%)",
            borderRadius: 999,
          }}
        />

        {/* Center Floating Plane Pill */}
        <div
          style={{
            width: compact ? 26 : 38,
            height: compact ? 26 : 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: compact
              ? "0 4px 10px rgba(15, 23, 42, 0.18)"
              : "0 8px 18px rgba(15, 23, 42, 0.22), 0 0 0 4px #ffffff",
            margin: compact ? "0 4px" : "0 6px",
            flexShrink: 0,
            zIndex: 2,
          }}
        >
          <CustomFlightIcon
            size={compact ? 13 : 19}
            color="#ffffff"
          />
        </div>

        {/* Remaining Dashed Track */}
        <div
          style={{
            flex: 0.85,
            height: 0,
            borderTop: compact ? "1.5px dashed #cbd5e1" : "2px dashed #cbd5e1",
          }}
        />

        {/* Destination Node */}
        <div
          style={{
            width: compact ? 6 : 7,
            height: compact ? 6 : 7,
            borderRadius: "50%",
            backgroundColor: "#94a3b8",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );

  // ─── Single Flight Instagram Post (4:5, White Card Boarding Pass Style) ───

  const renderSingleInstagramPost = (card: FlightCard) => {
    const activeConnectings = card.connectingDetails.filter(
      (d) => d.trim() !== ""
    );
    const activeDates = card.dates.filter(
      (d) => d.day.trim() !== "" || d.month.trim() !== ""
    );

    return (
      <div
        ref={posterRef}
        style={{
          width: 800,
          height: 1000,
          position: "relative",
          overflow: "hidden",
          fontFamily:
            "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Full-bleed Aerial Background Image — Top ~65% */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "65%",
            backgroundImage: `url(${singleBgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center 22%",
            zIndex: 1,
          }}
        />

        {/* Seamless feather gradient: fully transparent top -> melts into pure white #ffffff */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "65%",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.25) 55%, rgba(255, 255, 255, 0.82) 82%, #ffffff 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Content Layer — Floats cleanly on the pure white blended background */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "flex-end",
            padding: "0 28px 28px 28px",
          }}
        >
          {/* Custom SVG Boarding Pass Card (/roundedcardwhite.svg) */}
          <div
            style={{
              position: "relative",
              width: "100%",
              filter:
                "drop-shadow(0 20px 45px rgba(15, 23, 42, 0.08)) drop-shadow(0 4px 14px rgba(15, 23, 42, 0.04))",
            }}
          >
            {/* Background SVG Shape */}
            <svg
              viewBox="0 0 920 560"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <path
                d="M0 172C0 90.9184 0 50.3776 25.1888 25.1888C50.3776 0 90.9184 0 172 0H748C829.082 0 869.622 0 894.811 25.1888C920 50.3776 920 90.9184 920 172V344C920 425.082 920 465.622 894.811 490.811C869.622 516 829.082 516 748 516H623.902C601.07 516 589.654 516 580.431 518.051C571.208 520.103 555.196 527.596 523.173 542.582C503.074 551.988 479.633 560.225 459.5 560C440.554 559.788 418.681 552.016 399.668 543.062C367.232 527.786 351.014 520.148 341.742 518.074C332.47 516 320.999 516 298.057 516H172C90.9184 516 50.3776 516 25.1888 490.811C0 465.622 0 425.082 0 344V172Z"
                fill="white"
                stroke="rgba(226, 232, 240, 0.9)"
                strokeWidth="1.5"
              />
            </svg>

            {/* Inner Content Layer */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "44px 44px 52px 44px",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {/* Route Section — Bold city names with minimal flight path */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 6,
                }}
              >
                {/* From City */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: 44,
                      fontWeight: 400,
                      color: "#0f172a",
                      lineHeight: 1.1,
                      letterSpacing: "-0.03em",
                      wordBreak: "break-word",
                    }}
                  >
                    {toTitleCase(card.from)}
                  </div>
                </div>

                {renderModernRouteGraphic(false)}

                {/* To City */}
                <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: 44,
                      fontWeight: 400,
                      color: "#0f172a",
                      lineHeight: 1.1,
                      letterSpacing: "-0.03em",
                      wordBreak: "break-word",
                    }}
                  >
                    {toTitleCase(card.to)}
                  </div>
                </div>
              </div>

              {/* Connecting & Luggage Badges — Clean tactile pills */}
              {(activeConnectings.length > 0 ||
                (card.luggage && card.luggage.trim() !== "")) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                    marginBottom: 6,
                  }}
                >
                  {activeConnectings.map((detail, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "6px 14px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {detail}
                    </span>
                  ))}

                  {card.luggage && card.luggage.trim() !== "" && (
                    <span
                      key="luggage"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "6px 14px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <IconLuggage size={14} stroke={2.2} />
                      {card.luggage}
                    </span>
                  )}
                </div>
              )}

              {/* Minimal Dashed Divider */}
              <div
                style={{
                  borderTop: "1.5px dashed #e2e8f0",
                  marginTop: 18,
                  marginBottom: 20,
                }}
              />

              {/* Bottom Info Row — Airline | Dates | Price */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                }}
              >
                {/* Column 1: Airline */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingRight: 20,
                    borderRight: "1.5px solid #e2e8f0",
                    minHeight: 52,
                  }}
                >
                  {card.logoUrl ? (
                    <img
                      src={card.logoUrl}
                      alt="Airline"
                      style={{
                        maxHeight: 38,
                        maxWidth: 125,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#64748b",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Scheduled Flight
                    </span>
                  )}
                </div>

                {/* Column 2: Dates */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 20px",
                    borderRight: "1.5px solid #e2e8f0",
                    minHeight: 52,
                  }}
                >
                  {activeDates.length > 0 ? (
                    activeDates.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1,
                          }}
                        >
                          {d.day}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {d.month}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Daily Flights
                    </span>
                  )}
                </div>

                {/* Column 3: Price */}
                <div
                  style={{
                    flex: 1.1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingLeft: 20,
                    minHeight: 52,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: 38,
                      fontWeight: 400,
                      color: "#017746",
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {formatPrice(card.price)}
                  </div>
                  {card.priceLabel && (
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#64748b",
                        marginTop: 4,
                        textAlign: "right",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {card.priceLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer — Branded card sitting on the soft background */}
          <div
            style={{
              width: "100%",
              marginTop: 16,
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <PosterFooter contact={contact} />
          </div>
        </div>
      </div>
    );
  };

  // ─── Multi-Card List View (Single-Card Boarding Pass Style) ─────────────────

  const renderListCard = (card: FlightCard, index: number) => {
    const activeConnectings = card.connectingDetails.filter(
      (detail) => detail.trim() !== ""
    );
    const activeDates = card.dates.filter(
      (date) => date.day.trim() !== "" || date.month.trim() !== ""
    );

    return (
      <div
        key={card.id}
        style={{
          position: "relative",
          zIndex: cards.length - index,
          overflow: "visible",
          marginTop: index === 0 ? 0 : -18,
          fontFamily: "'Geist', sans-serif",
        }}
      >
        <svg
          viewBox="0 0 920 560"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient
              id={`list-ticket-stroke-${card.id}`}
              x1="460"
              y1="560"
              x2="460"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#f1f5f9" stopOpacity="1" />
              <stop offset="0.45" stopColor="#f1f5f9" stopOpacity="1" />
              <stop offset="0.6" stopColor="#f1f5f9" stopOpacity="0" />
              <stop offset="1" stopColor="#f1f5f9" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 172C0 90.9184 0 50.3776 25.1888 25.1888C50.3776 0 90.9184 0 172 0H748C829.082 0 869.622 0 894.811 25.1888C920 50.3776 920 90.9184 920 172V344C920 425.082 920 465.622 894.811 490.811C869.622 516 829.082 516 748 516H623.902C601.07 516 589.654 516 580.431 518.051C571.208 520.103 555.196 527.596 523.173 542.582C503.074 551.988 479.633 560.225 459.5 560C440.554 559.788 418.681 552.016 399.668 543.062C367.232 527.786 351.014 520.148 341.742 518.074C332.47 516 320.999 516 298.057 516H172C90.9184 516 50.3776 516 25.1888 490.811C0 465.622 0 425.082 0 344V172Z"
            fill="#ffffff"
            stroke={`url(#list-ticket-stroke-${card.id})`}
            strokeWidth="42"
            paintOrder="stroke"
          />
        </svg>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "44px 44px 52px",
          }}
        >
        {/* Route row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: 44,
                fontWeight: 400,
                color: "#0f172a",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                overflowWrap: "anywhere",
              }}
            >
              {toTitleCase(card.from)}
            </div>
          </div>
          {renderModernRouteGraphic(false)}
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: 44,
                fontWeight: 400,
                color: "#0f172a",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                overflowWrap: "anywhere",
              }}
            >
              {toTitleCase(card.to)}
            </div>
          </div>
        </div>

        {/* Connection and luggage pills */}
        {(activeConnectings.length > 0 || card.luggage.trim() !== "") && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            {activeConnectings.map((detail, index) => (
              <span
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                {detail}
              </span>
            ))}
            {card.luggage.trim() !== "" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                <IconLuggage size={14} stroke={2.2} /> {card.luggage}
              </span>
            )}
          </div>
        )}

        {/* Boarding pass divider */}
        <div
          style={{
            borderTop: "1.5px dashed #e2e8f0",
            marginTop: 18,
            marginBottom: 20,
          }}
        />

        {/* Airline, dates, and fare row */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              paddingRight: 20,
              borderRight: "1.5px solid #e2e8f0",
              minHeight: 52,
            }}
          >
            {card.logoUrl ? (
              <img
                src={card.logoUrl}
                alt="Airline"
                style={{ maxHeight: 38, maxWidth: 125, objectFit: "contain" }}
              />
            ) : (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Scheduled Flight
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
              borderRight: "1.5px solid #e2e8f0",
              minHeight: 52,
            }}
          >
            {activeDates.length > 0 ? (
              activeDates.map((date, index) => (
                <div
                  key={index}
                  style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}
                >
                  <span
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1,
                    }}
                  >
                    {date.day}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {date.month}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>
                Daily Flights
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1.1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingLeft: 20,
              minHeight: 52,
            }}
          >
            <div
              style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: 38,
                fontWeight: 400,
                color: "#017746",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                whiteSpace: "nowrap",
              }}
            >
              {formatPrice(card.price)}
            </div>
            {card.priceLabel && (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#64748b",
                  marginTop: 4,
                  textAlign: "right",
                }}
              >
                {card.priceLabel}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };

  // ─── Multi-Card Grid View (Readable Compact Boarding Pass) ─────────────────

  const renderGridCard = (card: FlightCard) => {
    const activeConnectings = card.connectingDetails.filter(
      (detail) => detail.trim() !== ""
    );
    const activeDates = card.dates.filter(
      (date) => date.day.trim() !== "" || date.month.trim() !== ""
    );

    return (
      <div
        key={card.id}
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#ffffff",
          borderRadius: 24,
          border: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Geist', sans-serif",
        }}
      >
        {/* Route names get the first and clearest read */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 5,
            minHeight: 30,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "'Geist', sans-serif",
              fontSize: gridColumns === 2 ? 22 : 17,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              overflowWrap: "anywhere",
            }}
          >
            {toTitleCase(card.from)}
          </span>
          {renderModernRouteGraphic(true)}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "right",
              fontFamily: "'Geist', sans-serif",
              fontSize: gridColumns === 2 ? 22 : 17,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              overflowWrap: "anywhere",
            }}
          >
            {toTitleCase(card.to)}
          </span>
        </div>

        {/* Connection and baggage details */}
        {(activeConnectings.length > 0 || card.luggage.trim() !== "") && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
            }}
          >
            {activeConnectings.map((detail, index) => (
              <span
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: gridColumns === 2 ? 11 : 10,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  padding: "5px 8px",
                  borderRadius: 999,
                  whiteSpace: "normal",
                }}
              >
                {detail}
              </span>
            ))}
            {card.luggage.trim() !== "" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: gridColumns === 2 ? 11 : 10,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  padding: "5px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                <IconLuggage size={11} stroke={2.2} /> {card.luggage}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            borderTop: "1.5px dashed #e2e8f0",
            marginTop: 12,
            marginBottom: 12,
          }}
        />

        {/* Airline and dates */}
        <div style={{ display: "flex", alignItems: "center", minHeight: 34 }}>
          <div
            style={{
              flex: "0 0 34%",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              paddingRight: 8,
              borderRight: "1px solid #e2e8f0",
              minHeight: 30,
            }}
          >
            {card.logoUrl ? (
              <img
                src={card.logoUrl}
                alt="Airline"
                style={{ maxHeight: 26, maxWidth: "100%", objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: gridColumns === 2 ? 10 : 9, fontWeight: 700, color: "#64748b" }}>
                Flight
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              alignItems: "center",
              alignContent: "center",
              justifyContent: "center",
              paddingLeft: 8,
              minHeight: 30,
            }}
          >
            {activeDates.length > 0 ? (
              activeDates.map((date, index) => (
                <span
                  key={index}
                  style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}
                >
                  <span
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: gridColumns === 2 ? 18 : 16,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1,
                    }}
                  >
                    {date.day}
                  </span>
                  <span style={{ fontSize: gridColumns === 2 ? 10 : 9, fontWeight: 700, color: "#64748b" }}>
                    {date.month}
                  </span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: gridColumns === 2 ? 10 : 9, fontWeight: 600, color: "#64748b" }}>
                Daily Flights
              </span>
            )}
          </div>
        </div>

        {/* Make the fare the clearest item after the route */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            borderTop: "1px solid #f1f5f9",
            marginTop: 10,
            paddingTop: 9,
          }}
        >
          {card.priceLabel ? (
            <span
              style={{
                minWidth: 0,
                fontSize: gridColumns === 2 ? 10 : 9,
                fontWeight: 600,
                lineHeight: 1.25,
                color: "#64748b",
              }}
            >
              {card.priceLabel}
            </span>
          ) : (
            <span style={{ fontSize: gridColumns === 2 ? 10 : 9, fontWeight: 600, color: "#64748b" }}>
              One way
            </span>
          )}
          <span
            style={{
              flexShrink: 0,
              fontFamily: "'Geist', sans-serif",
              fontSize: gridColumns === 2 ? 30 : 24,
              fontWeight: 400,
              color: "#017746",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {formatPrice(card.price)}
          </span>
        </div>
      </div>
    );
  };

  const renderMultiCardPoster = () => (
    <div
      ref={posterRef}
      style={{
        width: 800,
        background: "#f1f5f9",
        fontFamily: "'Geist', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header Banner */}
      <div style={{ position: "relative" }}>
        <img
          src={headerBanner}
          alt="Header"
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {/* Cards Container */}
      <div
        style={{
          padding: "24px 28px",
          marginTop: -130,
          background: "#f1f5f9",
          ...(cardLayout === "grid"
            ? {
                display: "grid",
                gridTemplateColumns:
                  gridColumns === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
                gap: 14,
              }
            : {
                display: "flex",
                flexDirection: "column" as const,
                gap: 0,
              }),
        }}
      >
        {cards.map((card, index) =>
          cardLayout === "grid"
            ? renderGridCard(card)
            : renderListCard(card, index)
        )}
      </div>

      {/* Footer Banner */}
      <div style={{ padding: "0 28px 26px", background: "#f1f5f9" }}>
        <PosterFooter contact={contact} />
      </div>
    </div>
  );

  const isSingleCard = cards.length === 1;

  // ─── Poster editor ───────────────────────────────────────────────────────

  const { navigateHome } = useNavigation();

  return (
    <Layout
      title="Flight Rate Poster"
      onNavigateHome={navigateHome}
      actions={
        <Button
          radius="md"
          leftSection={<Download size={16} />}
          onClick={handleDownload}
          color="green"
          size="sm"
        >
          Download Image
        </Button>
      }
    >
      <Box className={classes.workspaceWrapper}>
      <Box className={classes.mobileViewTabs}>
        <SegmentedControl
          aria-label="Poster workspace"
          value={mobileView}
          onChange={(value) => setMobileView(value as "edit" | "preview")}
          data={[
            { value: "edit", label: "Edit details" },
            { value: "preview", label: "Preview" },
          ]}
          fullWidth
          radius="md"
          color="green"
        />
      </Box>
      <SimpleGrid
        className={classes.workspace}
        data-mobile-view={mobileView}
        cols={{ base: 1, sm: 1, lg: 2 }}
        spacing={{ base: 0, sm: 0 }}
        verticalSpacing={{ base: 0, sm: 0 }}
        style={{ flex: 1, minHeight: 0, height: "100%" }}
      >
        <Paper
          withBorder
          radius={0}
          className={classes.editor}
          style={{
            height: "100%",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <ScrollArea style={{ flex: 1, height: "100%" }}>
            <Stack className={classes.form} gap="md">
              <Paper withBorder className={classes.section}>
                <Group justify="space-between" mb="md">
                  <Text component="h2" className={classes.sectionTitle}>
                    {isSingleCard ? "Background" : "Poster style"}
                  </Text>
                  {isSingleCard && (
                    <Text className={classes.format}>1080 × 1350 · 4:5</Text>
                  )}
                </Group>

                {isSingleCard ? (
                  <Stack gap="sm">
                    <div className={classes.imageGrid} role="group" aria-label="Background images">
                      {PRESET_BG_IMAGES.map((preset) => {
                        const isSelected = singleBgImage === preset.url;
                        return (
                          <UnstyledButton
                            key={preset.url}
                            type="button"
                            className={classes.imageChoice}
                            data-selected={isSelected || undefined}
                            aria-label={preset.label}
                            aria-pressed={isSelected}
                            onClick={() => setSingleBgImage(preset.url)}
                          >
                            <img src={preset.url} alt="" className={classes.backgroundImage} />
                            {isSelected && (
                              <span className={classes.selectionMark} aria-hidden="true">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            )}
                          </UnstyledButton>
                        );
                      })}
                      <input
                        id="background-image-upload"
                        className={classes.hiddenFileInput}
                        type="file"
                        accept="image/*"
                        aria-label="Upload a background image"
                        onChange={(event) => handleSingleBgUpload(event.currentTarget.files?.[0] ?? null)}
                      />
                      <label
                        htmlFor="background-image-upload"
                        className={classes.uploadChoice}
                        data-selected={!PRESET_BG_IMAGES.some((preset) => preset.url === singleBgImage) || undefined}
                      >
                        {!PRESET_BG_IMAGES.some((preset) => preset.url === singleBgImage) ? (
                          <img src={singleBgImage} alt="" className={`${classes.backgroundImage} ${classes.uploadPreview}`} />
                        ) : (
                          <span className={classes.uploadIcon}><Upload size={19} /></span>
                        )}
                        {!PRESET_BG_IMAGES.some((preset) => preset.url === singleBgImage) && (
                          <span className={classes.selectionMark} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                        )}
                        <span className={classes.uploadLabel}>Upload</span>
                      </label>
                    </div>
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <div className={classes.bannerGrid} role="group" aria-label="Header banners">
                      {HEADER_BANNER_OPTIONS.map((banner) => {
                        const isSelected = headerBanner === banner.value;
                        return (
                          <UnstyledButton
                            key={banner.value}
                            type="button"
                            className={classes.bannerChoice}
                            data-selected={isSelected || undefined}
                            aria-label={banner.label}
                            aria-pressed={isSelected}
                            onClick={() => setHeaderBanner(banner.value)}
                          >
                            <img src={banner.value} alt="" className={classes.bannerImage} />
                            {isSelected && (
                              <span className={classes.selectionMark} aria-hidden="true">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            )}
                          </UnstyledButton>
                        );
                      })}
                    </div>
                    <Box>
                      <Text className={classes.fieldHeading} mb={6}>Layout</Text>
                      <SegmentedControl
                        aria-label="Card layout"
                        value={cardLayout}
                        onChange={(val) => setCardLayout(val as "list" | "grid")}
                        data={[
                          {
                            value: "list",
                            label: <Group gap={6} justify="center" wrap="nowrap"><List size={15} /><span>List</span></Group>,
                          },
                          {
                            value: "grid",
                            label: <Group gap={6} justify="center" wrap="nowrap"><LayoutGrid size={15} /><span>Grid</span></Group>,
                          },
                        ]}
                        fullWidth
                        radius="md"
                        color="green"
                      />
                    </Box>
                    {cardLayout === "grid" && (
                      <SegmentedControl
                        aria-label="Grid columns"
                        value={String(gridColumns)}
                        onChange={(val) => setGridColumns(Number(val))}
                        data={[
                          { value: "2", label: "2 columns" },
                          { value: "3", label: "3 columns" },
                        ]}
                        fullWidth
                        radius="md"
                        color="green"
                      />
                    )}
                  </Stack>
                )}
              </Paper>

              <PosterContactForm contact={contact} onChange={setContact} />

              <Accordion
                value={openFlightId}
                onChange={setOpenFlightId}
                variant="separated"
                radius="md"
                className={classes.flightAccordion}
              >
              {cards.map((card, cardIndex) => (
                <Accordion.Item
                  key={card.id}
                  value={String(card.id)}
                  className={classes.flightItem}
                >
                  <Group gap={4} wrap="nowrap" className={classes.flightHeader}>
                    <Accordion.Control className={classes.flightControl}>
                      <Group gap="sm" wrap="nowrap">
                        <span className={classes.flightIcon} aria-hidden="true"><CustomFlightIcon size={15} /></span>
                        <Text component="h2" className={classes.sectionTitle}>Flight {cardIndex + 1}</Text>
                        <Text className={classes.routeSummary} lineClamp={1}>
                          {card.from || "From"} <span aria-hidden="true">→</span> {card.to || "To"}
                        </Text>
                      </Group>
                    </Accordion.Control>
                    {cards.length > 1 && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="lg"
                        radius="md"
                        aria-label={`Remove flight ${cardIndex + 1}`}
                        title={`Remove flight ${cardIndex + 1}`}
                        onClick={() => removeCard(card.id)}
                      >
                        <Trash2 size={17} />
                      </ActionIcon>
                    )}
                  </Group>

                  <Accordion.Panel>
                  <Stack gap="lg" className={classes.flightPanel}>
                    <Stack gap="sm">
                      <SimpleGrid cols={2} spacing="sm">
                        <TextInput
                          ref={(node) => { departureInputs.current[card.id] = node; }}
                          label="From"
                          placeholder="Departure city"
                          value={card.from}
                          onChange={(e) => updateCard(card.id, "from", e.target.value)}
                        />
                        <TextInput
                          label="To"
                          placeholder="Arrival city"
                          value={card.to}
                          onChange={(e) => updateCard(card.id, "to", e.target.value)}
                        />
                      </SimpleGrid>
                      <Select
                        label="Airline"
                        placeholder="Choose an airline"
                        data={LOGO_OPTIONS}
                        value={card.logoType}
                        searchable
                        allowDeselect={false}
                        onChange={(val) => {
                          updateCard(card.id, "logoType", val);
                          if (val && val !== "other") {
                            updateCard(card.id, "logoUrl", `/airlinelogos/${val}`);
                            updateCard(card.id, "logoFile", null);
                          } else if (val === "other") {
                            updateCard(card.id, "logoUrl", card.logoFile ? URL.createObjectURL(card.logoFile) : "");
                          }
                        }}
                      />
                      {card.logoType === "other" && (
                        <FileInput
                          aria-label="Upload an airline logo"
                          placeholder="Upload airline logo"
                          accept="image/*"
                          leftSection={<Upload size={16} />}
                          onChange={(file) => handleLogoUpload(card.id, file)}
                        />
                      )}
                    </Stack>

                    <Divider color="gray.2" />

                    <Stack gap="xs">
                      <Group justify="space-between" wrap="nowrap">
                        <Text component="h3" className={classes.fieldHeading}>Travel dates</Text>
                        <Button
                          variant="subtle"
                          color="green"
                          size="compact-sm"
                          leftSection={<Plus size={14} />}
                          onClick={() => addDate(card.id)}
                        >
                          Add date
                        </Button>
                      </Group>
                      <Stack gap="xs">
                        {card.dates.map((date, dateIndex) => (
                          <Group key={dateIndex} gap="xs" wrap="nowrap" align="flex-end">
                            <TextInput
                              label={dateIndex === 0 ? "Day" : undefined}
                              aria-label={`Flight ${cardIndex + 1}, date ${dateIndex + 1}, day`}
                              placeholder="DD"
                              autoFocus={date.day === "" && date.month === "" && dateIndex === card.dates.length - 1}
                              inputMode="numeric"
                              maxLength={2}
                              value={date.day}
                              onChange={(e) => updateDate(card.id, dateIndex, "day", e.target.value)}
                              style={{ flex: 1, minWidth: 0 }}
                            />
                            <TextInput
                              label={dateIndex === 0 ? "Month" : undefined}
                              aria-label={`Flight ${cardIndex + 1}, date ${dateIndex + 1}, month`}
                              placeholder="MAR"
                              value={date.month}
                              onChange={(e) => updateDate(card.id, dateIndex, "month", e.target.value)}
                              style={{ flex: 1, minWidth: 0 }}
                            />
                            <ActionIcon
                              color="gray"
                              variant="subtle"
                              size={40}
                              radius="md"
                              disabled={card.dates.length === 1}
                              aria-label={`Remove date ${dateIndex + 1} from flight ${cardIndex + 1}`}
                              title="Remove date"
                              onClick={() => removeDate(card.id, dateIndex)}
                            >
                              <Trash2 size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    </Stack>

                    <Stack gap="xs">
                      <Group justify="space-between" wrap="nowrap">
                        <Text component="h3" className={classes.fieldHeading}>Connections <span className={classes.optional}>Optional</span></Text>
                        <Button
                          variant="subtle"
                          color="green"
                          size="compact-sm"
                          leftSection={<Plus size={14} />}
                          onClick={() => addConnecting(card.id)}
                        >
                          Add connection
                        </Button>
                      </Group>
                      {card.connectingDetails.map((detail, connectionIndex) => (
                        <Group key={connectionIndex} gap="xs" wrap="nowrap">
                          <TextInput
                            aria-label={`Flight ${cardIndex + 1}, connection ${connectionIndex + 1}`}
                            placeholder="MCT 08:30 → FJR 09:25"
                            autoFocus={detail === "" && connectionIndex === card.connectingDetails.length - 1}
                            value={detail}
                            onChange={(e) => updateConnecting(card.id, connectionIndex, e.target.value)}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <ActionIcon
                            color="gray"
                            variant="subtle"
                            size={40}
                            radius="md"
                            aria-label={`Remove connection ${connectionIndex + 1} from flight ${cardIndex + 1}`}
                            title="Remove connection"
                            onClick={() => removeConnecting(card.id, connectionIndex)}
                          >
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>

                    <Divider color="gray.2" />

                    <Stack gap="sm">
                      <SimpleGrid cols={2} spacing="sm">
                        <NumberInput
                          label="Price"
                          placeholder="12,000"
                          prefix="₹ "
                          thousandSeparator=","
                          value={card.price}
                          onChange={(val) => updateCard(card.id, "price", val)}
                          min={0}
                          hideControls
                        />
                        <TextInput
                          label="Baggage"
                          placeholder="30 + 7 KG"
                          value={card.luggage}
                          onChange={(e) => updateCard(card.id, "luggage", e.target.value)}
                        />
                      </SimpleGrid>
                      <TextInput
                        label="Fare note"
                        placeholder="e.g. One way per traveler"
                        value={card.priceLabel}
                        onChange={(e) => updateCard(card.id, "priceLabel", e.target.value)}
                      />
                    </Stack>
                  </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
              </Accordion>
            </Stack>
          </ScrollArea>
          <div className={classes.addFlightBar}>
            <Button
              variant="light"
              color="green"
              leftSection={<Plus size={17} />}
              onClick={addCard}
              radius="md"
              size="md"
              fullWidth
            >
              Add another flight
            </Button>
          </div>
        </Paper>

        {/* Preview */}
        <Paper
          withBorder
          radius={0}
          className={classes.preview}
          style={{
            height: "100%",
            flexDirection: "column",
            minHeight: 0,
            backgroundColor: "#f8fafc",
          }}
        >
          <ScrollArea className={classes.previewScroll} style={{ flex: 1, height: "100%" }}>
            <Box p="md" className={classes.previewContent}>
              <ScaledPosterPreview
                width={800}
                scale={0.62}
              >
                {isSingleCard
                  ? renderSingleInstagramPost(cards[0])
                  : renderMultiCardPoster()}
              </ScaledPosterPreview>
            </Box>
          </ScrollArea>
        </Paper>
      </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default FlightPosterGenerator;
