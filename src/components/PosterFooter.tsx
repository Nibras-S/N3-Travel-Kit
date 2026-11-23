import { useLayoutEffect, useRef } from "react";
import { IconBrandWhatsapp, IconMapPin } from "@tabler/icons-react";
import type { PosterContact } from "./usePosterContact";
import classes from "./PosterFooter.module.css";

interface PosterFooterProps {
  contact: PosterContact;
}

/** Shared flex footer; only the two icons use SVG. */
export function PosterFooter({ contact }: PosterFooterProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const phoneLineRef = useRef<HTMLDivElement>(null);
  const phoneTextRef = useRef<HTMLSpanElement>(null);
  const phoneText = [contact.phone.trim(), contact.additionalPhone.trim()]
    .filter(Boolean)
    .join(", ");
  const staffName = contact.staffName.trim();

  // Keep international numbers on one line without compressing ordinary numbers.
  useLayoutEffect(() => {
    let active = true;
    const fitPhone = () => {
      const line = phoneLineRef.current;
      const text = phoneTextRef.current;
      if (!active || !line || !text || !line.clientWidth) return;
      text.style.fontSize = "100%";
      const baseSize = parseFloat(getComputedStyle(line).fontSize);
      const availableWidth = line.clientWidth;
      // scrollWidth measures before the poster preview's scale transform.
      const naturalWidth = text.scrollWidth;
      if (naturalWidth > availableWidth) {
        text.style.fontSize = `${baseSize * availableWidth / naturalWidth}px`;
      }
    };
    fitPhone();
    const observer = new ResizeObserver(fitPhone);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    void document.fonts.ready.then(fitPhone);
    document.fonts.addEventListener("loadingdone", fitPhone);
    return () => {
      active = false;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fitPhone);
    };
  }, [phoneText, staffName]);

  return (
    <div ref={wrapperRef} className={classes.wrapper}>
      <footer className={classes.footer} aria-label="N3 TravelKit poster contact details">
        <div className={classes.brand}>
          <img src="/N3TravelKit.png" alt="N3 TravelKit" className={classes.logo} />
        </div>

        <div className={classes.divider} aria-hidden="true" />

        <div className={classes.contact}>
          {phoneText && <IconBrandWhatsapp className={classes.icon} stroke={2} aria-hidden="true" />}
          <div className={classes.contactCopy}>
            {staffName && <div className={classes.staffName}>{staffName}</div>}
            {phoneText && (
              <div ref={phoneLineRef} className={classes.phoneLine}>
                <span ref={phoneTextRef} className={classes.phoneText}>{phoneText}</span>
              </div>
            )}
          </div>
        </div>

        <div className={classes.divider} aria-hidden="true" />

        <div className={classes.address}>
          <IconMapPin className={classes.icon} stroke={2} aria-hidden="true" />
          <div className={classes.addressCopy}>
            <div className={classes.addressHeading}>Royal Oak Mall,</div>
            <div className={classes.addressLocation}>Thana, Kannur</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Covers the contact details baked into the visa template artwork. */
export function VisaPosterFooter({ contact }: PosterFooterProps) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, padding: "18px 40px", boxSizing: "border-box", background: "#ffffff", display: "flex", alignItems: "center", zIndex: 7 }}>
      <PosterFooter contact={contact} />
    </div>
  );
}
