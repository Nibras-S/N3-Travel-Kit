import { useEffect, useState } from "react";
import { useTenant } from "../tenant/context";

export interface PosterContact {
  phone: string;
  additionalPhone: string;
  staffName: string;
}

/** Personal poster overrides are isolated by organization and signed-in user. */
export function usePosterContact() {
  const { tenantId, userId, branding } = useTenant();
  const key = `n3travelkit:${tenantId}:${userId}:poster-contact:${branding.phone}:${branding.additionalPhone}`;
  const [contact, setContact] = useState<PosterContact>(() => {
    const defaults = { phone: branding.phone, additionalPhone: branding.additionalPhone, staffName: "" };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as Partial<PosterContact> | null;
      return {
        phone: typeof saved?.phone === "string" ? saved.phone : defaults.phone,
        additionalPhone: typeof saved?.additionalPhone === "string" ? saved.additionalPhone : defaults.additionalPhone,
        staffName: typeof saved?.staffName === "string" ? saved.staffName : "",
      };
    } catch { return defaults; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(contact)); } catch { /* Editing still works without browser storage. */ }
  }, [key, contact]);
  return [contact, setContact] as const;
}
