import { useEffect, useState } from "react";

export interface PosterContact {
  phone: string;
  additionalPhone: string;
  staffName: string;
}

export const DEFAULT_POSTER_CONTACT: PosterContact = {
  phone: "860 655 0235",
  additionalPhone: "871 420 0235",
  staffName: "",
};

const STORAGE_KEY = "n3travelkit_poster_contact";

function loadContact(): PosterContact {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_POSTER_CONTACT };
    const data = saved as Record<string, unknown>;
    return {
      phone: typeof data.phone === "string" ? data.phone : DEFAULT_POSTER_CONTACT.phone,
      additionalPhone: typeof data.additionalPhone === "string" ? data.additionalPhone : DEFAULT_POSTER_CONTACT.additionalPhone,
      staffName: typeof data.staffName === "string" ? data.staffName : "",
    };
  } catch {
    return { ...DEFAULT_POSTER_CONTACT };
  }
}

/** Remember the employee's contact details when moving between poster tools. */
export function usePosterContact() {
  const [contact, setContact] = useState<PosterContact>(loadContact);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contact));
    } catch {
      // The current poster can still be edited when browser storage is unavailable.
    }
  }, [contact]);

  return [contact, setContact] as const;
}
