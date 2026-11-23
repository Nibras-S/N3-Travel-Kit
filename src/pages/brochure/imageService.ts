// src/pages/brochure/imageService.ts
// Auto-fetches high-resolution travel photographs from Unsplash (with Wikipedia fallback)
// for each image slot in the brochure.
// Prevents duplicate images across slots by tracking used URLs/photo IDs.

import type { BrochureData, BrochureImages } from "./types";

const UNSPLASH_API = "https://api.unsplash.com/search/photos";
const UNSPLASH_KEY =
  import.meta.env.VITE_UNSPLASH_ACCESS_KEY ||
  "DHyBGMFWgTFh1AGXq3zkprbv6uJ3z5SEcQGVAt4XI_0";

const WIKI_API = "https://en.wikipedia.org/w/api.php";

/**
 * Normalise a photo URL to a unique identifier key to prevent duplicates
 */
function getPhotoKey(url: string): string {
  // If Unsplash URL (e.g. https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?...)
  const unsplashMatch = url.match(/photo-([a-zA-Z0-9_-]+)/);
  if (unsplashMatch) return `unsplash:${unsplashMatch[1]}`;

  // If Wikipedia thumbnail
  const wikiClean = url.replace(/\/thumb\//, "/").replace(/\/\d+px-[^/]+$/, "");
  return `wiki:${wikiClean}`;
}

/**
 * Search Unsplash for high-resolution images matching the query.
 * Returns candidate image URLs (regular size ~1080px).
 */
async function searchUnsplashCandidates(query: string): Promise<string[]> {
  if (!UNSPLASH_KEY) return [];

  const cleanQuery = query
    .replace(/[/•·,&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanQuery) return [];

  try {
    const params = new URLSearchParams({
      query: cleanQuery,
      per_page: "8",
      orientation: "landscape",
      client_id: UNSPLASH_KEY,
    });

    const res = await fetch(`${UNSPLASH_API}?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results
          .map((item: { urls?: { regular?: string } }) => item.urls?.regular)
          .filter((url: string | undefined): url is string => Boolean(url));
      }
    }
  } catch {
    /* fallback to wiki */
  }

  return [];
}

/**
 * Search Wikipedia as fallback if Unsplash doesn't return results.
 */
async function searchWikiCandidates(query: string): Promise<string[]> {
  const cleanQuery = query
    .replace(/[/•·,&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanQuery) return [];

  const candidates: string[] = [];

  // Wikipedia full-text search
  try {
    const searchParams = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: cleanQuery,
      gsrlimit: "6",
      prop: "pageimages",
      format: "json",
      pithumbsize: "1200",
      origin: "*",
    });
    const res = await fetch(`${WIKI_API}?${searchParams}`);
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const sorted = (
          Object.values(pages) as { index?: number; thumbnail?: { source?: string } }[]
        ).sort((a, b) => (a.index || 0) - (b.index || 0));
        for (const page of sorted) {
          if (page.thumbnail?.source) {
            candidates.push(page.thumbnail.source);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return candidates;
}

/**
 * Get all image candidates for a query, prioritizing Unsplash, then Wikipedia
 */
async function getCandidatesForQuery(query: string): Promise<string[]> {
  let urls = await searchUnsplashCandidates(query);

  // If Unsplash didn't find anything (or query was too niche), fallback to Wikipedia
  if (urls.length === 0) {
    urls = await searchWikiCandidates(query);
  }

  return urls;
}

/**
 * Derive image search queries for each slot from the brochure data.
 */
function deriveSlotQueries(
  data: BrochureData
): { slotId: string; query: string }[] {
  const queries: { slotId: string; query: string }[] = [];
  const dests = data.destinations || [];

  // --- Cover page ---
  queries.push({
    slotId: "cover-main",
    query: dests[0] ? `${dests[0]} landmark travel` : data.packageTitle,
  });
  queries.push({
    slotId: "cover-sub-1",
    query: dests[1] || (data.days?.[0]?.location ?? "travel destination"),
  });
  queries.push({
    slotId: "cover-sub-2",
    query: dests[2] || (data.days?.[1]?.location ?? "architecture landscape"),
  });

  // --- Day detail pages ---
  (data.days || []).forEach((day, i) => {
    // Main image: use imageCaption (often has specific landmark info)
    const mainQuery = day.imageCaption
      ? day.imageCaption.replace(/[/•·]+/g, " ").trim()
      : `${day.location} travel`;
    queries.push({ slotId: `day-${i}-main`, query: mainQuery });

    // Sub image: use location name + culture/explore
    queries.push({ slotId: `day-${i}-sub`, query: `${day.location} architecture` });
  });

  // --- Closing page ---
  const closingQuery =
    dests[dests.length - 1] || dests[0] || data.packageTitle || "travel";
  queries.push({ slotId: "closing-main", query: `${closingQuery} scenery` });

  return queries;
}

/**
 * Fetch images for all empty slots in the brochure.
 * Existing (user-uploaded) images are never overwritten.
 * Ensures no two slots share the same image.
 */
export async function fetchImagesForBrochure(
  data: BrochureData,
  existingImages: BrochureImages
): Promise<BrochureImages> {
  const queries = deriveSlotQueries(data);
  const toFetch = queries.filter((q) => !existingImages[q.slotId]);

  if (toFetch.length === 0) return existingImages;

  // Track used image keys (both user-uploaded and newly assigned)
  const usedKeys = new Set<string>();
  for (const url of Object.values(existingImages)) {
    if (url) usedKeys.add(getPhotoKey(url));
  }

  // Fetch candidates for all slots in parallel
  const allCandidates = await Promise.all(
    toFetch.map(async (q) => {
      const urls = await getCandidatesForQuery(q.query);
      return { slotId: q.slotId, urls };
    })
  );

  const autoImages: BrochureImages = {};

  for (const { slotId, urls } of allCandidates) {
    // Pick the first candidate that hasn't been used yet
    for (const url of urls) {
      const key = getPhotoKey(url);
      if (!usedKeys.has(key)) {
        usedKeys.add(key);
        autoImages[slotId] = url;
        break;
      }
    }
  }

  // User-uploaded images always take priority over auto-fetched
  return { ...autoImages, ...existingImages };
}
