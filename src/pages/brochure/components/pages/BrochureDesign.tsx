import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../types";
import "./brochure.css";

interface BrochurePageProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const BrochurePage = ({
  children,
  className = "",
  style,
}: BrochurePageProps) => (
  <article
    className={`brochure-page sb-page ${className}`}
    style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, ...style }}
  >
    {children}
  </article>
);

export const BrochureBrand = ({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) => (
  <div
    className={`sb-brand${inverse ? " sb-brand--inverse" : ""}${compact ? " sb-brand--compact" : ""}`}
  >
    <img src="/N3TravelKit.png" alt="N3 TravelKit" />
  </div>
);

export const BrochureFooter = ({
  label,
  pageNumber,
  totalPages,
  inverse = false,
}: {
  label: string;
  pageNumber: number;
  totalPages: number;
  inverse?: boolean;
}) => (
  <footer className={`sb-footer${inverse ? " sb-footer--inverse" : ""}`}>
    <span className="sb-footer-label">{label}</span>
    <span className="sb-footer-pagination">
      <strong>{String(pageNumber).padStart(2, "0")}</strong>
      <span className="sb-footer-divider" />
      {String(totalPages).padStart(2, "0")}
    </span>
  </footer>
);

/**
 * Fit the actual rendered text, not a character-count estimate. Font sizes and
 * vertical rhythm share a scale, so longer AI edits stay on their page without
 * line-clamping or dropping itinerary / booking information. The inline scale
 * is also carried into react-to-print's cloned document.
 */
export const FitContent = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let disposed = false;
    let frame = 0;

    const fit = () => {
      if (disposed || viewport.clientHeight === 0) return;
      const viewportStyle = getComputedStyle(viewport);
      const availableHeight =
        viewport.clientHeight -
        parseFloat(viewportStyle.paddingTop) -
        parseFloat(viewportStyle.paddingBottom) -
        2;
      viewport.style.setProperty("--sb-fit", "1");

      let scale = 1;
      if (content.scrollHeight > availableHeight) {
        let low = 0.35;
        let high = 1;
        // Find the largest readable size that fits the real available space.
        for (let step = 0; step < 10; step += 1) {
          const candidate = (low + high) / 2;
          viewport.style.setProperty("--sb-fit", String(candidate));
          if (content.scrollHeight <= availableHeight) low = candidate;
          else high = candidate;
        }
        scale = Math.floor(low * 1000) / 1000;
        viewport.style.setProperty("--sb-fit", String(scale));
      }
      viewport.dataset.contentScale = String(scale);
      viewport.dataset.contentOverflow = String(
        content.scrollHeight > availableHeight,
      );
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    fit();
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(viewport);
    document.fonts.ready.then(() => {
      if (!disposed) scheduleFit();
    });
    document.fonts.addEventListener("loadingdone", scheduleFit);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", scheduleFit);
    };
  }, [children]);

  return (
    <div ref={viewportRef} className={`sb-fit ${className}`}>
      <div ref={contentRef} className="sb-fit-content">
        {children}
      </div>
    </div>
  );
};
