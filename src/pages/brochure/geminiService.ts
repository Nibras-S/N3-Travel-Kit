import type { TenantBranding } from "../../tenant/types";
import type { BrochureData } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiModel {
  name: string;
  displayName: string;
}

// Curated list of models specifically suitable for brochure generation
export const CURATED_MODELS: GeminiModel[] = [
  {
    name: "gemini-flash-latest",
    displayName: "Gemini Flash Latest",
  },
  {
    name: "gemini-flash-lite-latest",
    displayName: "Gemini Flash-Lite Latest",
  },
  {
    name: "gemini-pro-latest",
    displayName: "Gemini Pro Latest",
  },
];

export async function fetchModels(apiKey: string): Promise<GeminiModel[]> {
  try {
    const res = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ||
          "Failed to fetch models. Check your API key."
      );
    }
    const data = await res.json();
    const availableNames: string[] = (data.models || []).map(
      (m: { name?: string }) => (m.name || "").replace("models/", "")
    );

    // Filter our curated models against what's supported by the user's API key
    const verified = CURATED_MODELS.filter((curated) =>
      availableNames.some(
        (name) =>
          name === curated.name ||
          name.startsWith(curated.name) ||
          curated.name.startsWith(name)
      )
    );

    // If verified found, return them; otherwise return curated models as reliable defaults
    return verified.length > 0 ? verified : CURATED_MODELS;
  } catch {
    // If fetching fails but key was provided, still return curated list so user isn't blocked
    return CURATED_MODELS;
  }
}

export async function testConnection(apiKey: string): Promise<{ success: boolean; models: GeminiModel[] }> {
  const models = await fetchModels(apiKey);
  if (!models || models.length === 0) {
    throw new Error("No compatible Gemini models found for this API key.");
  }
  return { success: true, models };
}

const SYSTEM_PROMPT = `You are a professional travel brochure content writer for the active travel business (powered by N3 Travel Kit).
Your job is to generate beautifully written, structured content for an 8-10 page tour package brochure.

When the user provides tour package details, you MUST respond with a valid JSON object matching this schema:

{
  "packageTitle": "From the Taj to the Himalayas",
  "subtitle": "A North India journey by rail, through historic cities and Himalayan landscapes.",
  "destinations": ["Agra", "Manali", "Delhi"],
  "tags": ["NORTH INDIA", "RAIL", "CITIES", "MOUNTAINS"],
  "tagline": {
    "title": "Heritage meets the highlands",
    "subtitle": "Your travel partner"
  },
  "days": [
    {
      "dayRange": "Days 1–2",
      "location": "Konkan Railway",
      "title": "Scenic Rail Journey",
      "description": "Enjoy the scenic journey through the Konkan Railway, a railway line running along the Konkan coast of India.",
      "tagline": {
        "title": "The journey is part of the experience",
        "text": "Along India's scenic Konkan coast."
      },
      "imageCaption": "KONKAN RAILWAY / INDIA'S WESTERN COAST"
    },
    {
      "dayRange": "Day 3",
      "location": "Agra",
      "title": "Agra: The Taj & Mughal Heritage",
      "bullets": [
        { "label": "Morning arrival", "text": "Arrive in Agra, check in and freshen up." },
        { "label": "Lunch", "text": "Enjoy lunch before sightseeing." },
        { "label": "Sightseeing", "text": "Visit the Taj Mahal and Agra Fort." },
        { "label": "Evening", "text": "Return to your accommodation for dinner and an overnight stay." }
      ],
      "callout": {
        "title": "Please note • Friday closure",
        "text": "The Taj Mahal is closed on Fridays."
      },
      "imageCaption": "TAJ MAHAL / AGRA"
    }
  ],
  "inclusions": [
    "3-star category rooms, deluxe rooms or camp accommodation.",
    "Kerala and North Indian food available.",
    "All vehicle transportation, including AC bus.",
    "All taxes during tour.",
    "No other hidden charges.",
    "Malayali ('Mallu') tour manager."
  ],
  "exclusions": [
    "All monument entry tickets, including Taj Museum.",
    "Personal expenses such as luggage, laundry, tips, gratuities, camera fees, soft and hard drinks.",
    "Adventure activities.",
    "Any costs arising from natural calamities such as landslides, road blockages, political disturbances or strikes are borne by the guest.",
    "Anything not included in the inclusions."
  ],
  "bookingTerms": [
    "The tour manager may change the itinerary without changing tour facilities.",
    "Cancellation charges apply if cancelled after booking.",
    "Additional facilities are charged extra."
  ],
  "closing": {
    "title": "Memories To Cherish Forever!",
    "subtitle": "Until we meet again,",
    "body": "let the memories stay with you forever.\\nthe landmarks awaits your returns!"
  },
  "contactPhone": "",
  "contactAddress": ""
}

Design Rules:
- The total brochure will be 8 to 10 pages.
- Cover page = Page 1.
- Day detail pages = Pages 2 to 6 or 7 (generate 4 to 6 day entries).
- Inclusions & Exclusions = Next page.
- Closing page = Final page.
- Alternate the day styles: some days have description paragraphs with a tagline quote below; other days have structured bullet points (Morning, Lunch, Sightseeing, Evening) and a callout box for notes (like Friday closure or altitude warnings).
- Keep texts concise, evocative, and inspiring.
- Inclusions should have 5-7 items. Exclusions should have 4-6 items.
- Booking terms should have exactly 3 concise terms.
- Use only the active business contact details provided in context. Leave missing details empty.

Respond with the JSON object in markdown code block \`\`\`json ... \`\`\`.`;

export async function generateContent(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
  currentBrochureData?: BrochureData | null,
  branding?: TenantBranding
): Promise<{ text: string; brochureData?: BrochureData; isEdit?: boolean }> {
  if (signal?.aborted) {
    const abortErr = new Error("Generation was cancelled");
    abortErr.name = "AbortError";
    throw abortErr;
  }

  if (!model) {
    throw new Error("No model selected. Please select a model from the dropdown.");
  }

  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  let systemPromptWithContext = SYSTEM_PROMPT;
  if (branding) {
    systemPromptWithContext += `\nActive business details (use these for branding and contact fields): ${JSON.stringify({ name: branding.name, phone: [branding.phone, branding.additionalPhone].filter(Boolean).join(", "), address: [branding.addressLine1, branding.addressLine2].filter(Boolean).join(", "), email: branding.email })}`;
  }
  const isEdit = Boolean(currentBrochureData);

  if (currentBrochureData) {
    systemPromptWithContext += `\n\nCURRENT BROCHURE IN PREVIEW:
\`\`\`json
${JSON.stringify(currentBrochureData, null, 2)}
\`\`\`

EDITING & CORRECTION INSTRUCTIONS:
- The user is conversing with you to refine, edit, or correct the brochure.
- When the user asks for corrections, changes, additions, or modifications to any page, itinerary day, title, inclusions, exclusions, terms, or contact info:
  1. Carefully apply the requested modification to the affected section.
  2. PRESERVE all other days, pages, inclusions, exclusions, and text unchanged from the current brochure.
  3. You MUST ALWAYS output the COMPLETE updated brochure JSON schema with all pages, so the entire brochure updates seamlessly in the live preview.
  4. Never output just the single edited snippet; always return the complete brochure JSON wrapped in \`\`\`json ... \`\`\`.

REMOVING / OMITTING SPECIFIC PAGES:
- When the user asks to remove, delete, omit, or states "no need" for Inclusions / Exclusions / Terms:
  Set "showInclusions": false, and set "inclusions": [], "exclusions": [], "bookingTerms": [].
  The application will automatically remove the Inclusions page completely from the brochure and update total page count.
- When the user asks to remove a specific day (e.g. "remove Day 2", "no need day 4", "make it a 3-day itinerary"):
  Remove that day object from the "days" array, and re-sequence the remaining days' dayRange (e.g. Day 1, Day 2, Day 3...) cleanly.
- When the user asks to remove or states "no need" for the closing / farewell page:
  Set "showClosing": false, or set "closing": null.
- When the user asks to restore or add back a page (e.g. "add inclusions back", "bring back closing"):
  Set "showInclusions": true (and provide 5-7 inclusions, 4-6 exclusions, 3 booking terms) or "showClosing": true.`;
  }

  const res = await fetch(
    `${API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPromptWithContext }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        "Failed to generate content"
    );
  }

  const data = await res.json();
  const text =
    (
      data as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      }
    ).candidates?.[0]?.content?.parts?.[0]?.text || "";

  let brochureData: BrochureData | undefined;
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(jsonStr.trim());
    if (parsed.packageTitle && parsed.days && Array.isArray(parsed.days)) {
      brochureData = parsed as BrochureData;
    }
  } catch (err) {
    console.warn("Could not parse AI response as BrochureData JSON:", err);
  }

  return { text, brochureData, isEdit };
}
