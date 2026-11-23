import type { BrochureDayPage, BrochureImages } from "../../types";
import {
  BrochureBrand,
  BrochureFooter,
  BrochurePage,
  FitContent,
} from "./BrochureDesign";
import { EditorialImageSlot } from "./EditorialImageSlot";

interface DayDetailPageProps {
  day: BrochureDayPage;
  dayIndex: number;
  pageNumber: number;
  totalPages: number;
  footerDestination: string;
  images: BrochureImages;
  onImageUpload: (slotId: string, dataUrl: string) => void;
  onImageRemove: (slotId: string) => void;
}

export const DayDetailPage = ({
  day,
  dayIndex,
  pageNumber,
  totalPages,
  footerDestination,
  images,
  onImageUpload,
  onImageRemove,
}: DayDetailPageProps) => {
  const mainSlot = `day-${dayIndex}-main`;
  const subSlot = `day-${dayIndex}-sub`;
  const reverse = dayIndex % 2 === 1;

  return (
    <BrochurePage className={`sb-page--day${reverse ? " sb-page--day-reverse" : ""}`}>
      <div className="sb-day-visual">
        <EditorialImageSlot
          slotId={mainSlot}
          image={images[mainSlot]}
          onUpload={onImageUpload}
          onRemove={onImageRemove}
          caption={day.imageCaption || day.location}
          captionPlacement="top"
          borderRadius={0}
        />
        <div className="sb-day-photo-detail">
          <EditorialImageSlot
            slotId={subSlot}
            image={images[subSlot]}
            onUpload={onImageUpload}
            onRemove={onImageRemove}
            caption="A closer look"
            borderRadius={18}
          />
        </div>
      </div>

      <div className="sb-day-copy">
        <header className="sb-running-header">
          <span className="sb-eyebrow">The journey / Travel notes</span>
          <BrochureBrand compact />
        </header>

        <FitContent className="sb-day-story">
          <div className="sb-day-meta">
            <span className="sb-day-index" aria-hidden="true">
              {String(dayIndex + 1).padStart(2, "0")}
            </span>
            <div className="sb-day-meta-copy">
              <p className="sb-day-range">{day.dayRange}</p>
              <p className="sb-day-location">{day.location}</p>
            </div>
          </div>

          <h2 className="sb-heading">{day.title}</h2>
          {day.description && (
            <p className="sb-body sb-day-description">{day.description}</p>
          )}

          {Boolean(day.bullets?.length) && (
            <ol className="sb-itinerary" aria-label="Itinerary">
              {day.bullets?.map((bullet, index) => (
                <li key={index}>
                  <span className="sb-itinerary-label">{bullet.label}</span>
                  <span className="sb-itinerary-text">{bullet.text}</span>
                </li>
              ))}
            </ol>
          )}

          {day.tagline && (day.tagline.title || day.tagline.text) && (
            <blockquote className="sb-day-tagline">
              <span className="sb-quote-mark" aria-hidden="true">“</span>
              <div>
                <p className="sb-day-tagline-title">{day.tagline.title}</p>
                <p className="sb-day-tagline-text">{day.tagline.text}</p>
              </div>
            </blockquote>
          )}

          {day.callout && (day.callout.title || day.callout.text) && (
            <aside className="sb-day-callout">
              <p className="sb-day-callout-title">{day.callout.title}</p>
              <p className="sb-day-callout-text">{day.callout.text}</p>
            </aside>
          )}
        </FitContent>

        <BrochureFooter
          label={footerDestination}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
      </div>
    </BrochurePage>
  );
};
