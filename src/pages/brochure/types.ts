export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 697; // Landscape canvas shared by preview and PDF export

export const COLORS = {
  titleBlue: "#26ADE4",
  brandGreen: "#3BB56F",
  darkGreen: "#0284C7",
  teal: "#26ADE4",
  darkText: "#1E293B",
  grayText: "#475569",
  lightGray: "#FFFFFF",
  border: "#E2E8F0",
  footerText: "#94A3B8",
  white: "#FFFFFF",
} as const;

export interface BrochureDayPage {
  dayRange: string;
  location: string;
  title: string;
  description?: string;
  bullets?: { label: string; text: string }[];
  callout?: { title: string; text: string };
  tagline?: { title: string; text: string };
  imageCaption: string;
}

export interface BrochureData {
  packageTitle: string;
  subtitle: string;
  destinations: string[];
  tags: string[];
  tagline: { title: string; subtitle: string };
  days: BrochureDayPage[];
  inclusions?: string[];
  exclusions?: string[];
  bookingTerms?: string[];
  closing?: {
    title: string;
    subtitle: string;
    body: string;
  } | null;
  contactPhone?: string;
  contactAddress?: string;
  showInclusions?: boolean;
  showClosing?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  brochureData?: BrochureData;
}

export interface BrochureImages {
  [slotId: string]: string;
}
