import type { BrochureData, BrochureImages } from "../../types";
import {
  BrochureBrand,
  BrochureFooter,
  BrochurePage,
  FitContent,
} from "./BrochureDesign";
import { EditorialImageSlot } from "./EditorialImageSlot";

interface CoverPageProps {
  data: BrochureData;
  images: BrochureImages;
  onImageUpload: (slotId: string, dataUrl: string) => void;
  onImageRemove: (slotId: string) => void;
  totalPages: number;
}

export const CoverPage = ({
  data,
  images,
  onImageUpload,
  onImageRemove,
  totalPages,
}: CoverPageProps) => (
  <BrochurePage className="sb-page--cover">
    <div className="sb-cover-copy">
      <header className="sb-running-header">
        <BrochureBrand />
        <span className="sb-eyebrow">The N3 TravelKit collection</span>
      </header>

      <FitContent className="sb-cover-story">
        <p className="sb-eyebrow">
          {data.tags?.length ? data.tags.join(" / ") : "A signature journey"}
        </p>
        <h1 className="sb-cover-title">{data.packageTitle}</h1>
        {data.subtitle && <p className="sb-body">{data.subtitle}</p>}

        {Boolean(data.destinations?.length) && (
          <ol className="sb-destination-route" aria-label="Destinations">
            {data.destinations.map((destination, index) => (
              <li key={`${destination}-${index}`}>
                {index > 0 && <span className="sb-route-connector" aria-hidden="true" />}
                <span className="sb-route-dot" aria-hidden="true" />
                <span>{destination}</span>
              </li>
            ))}
          </ol>
        )}

        {data.tagline && (data.tagline.title || data.tagline.subtitle) && (
          <div className="sb-cover-note">
            <p className="sb-cover-note-title">{data.tagline.title}</p>
            <p className="sb-cover-note-subtitle">{data.tagline.subtitle}</p>
          </div>
        )}
      </FitContent>

      <BrochureFooter
        label="Your journey starts here"
        pageNumber={1}
        totalPages={totalPages}
      />
    </div>

    <div className="sb-cover-visual">
      <EditorialImageSlot
        slotId="cover-main"
        image={images["cover-main"]}
        onUpload={onImageUpload}
        onRemove={onImageRemove}
        caption={data.destinations?.[0] || "Featured destination"}
        captionPlacement="top"
        borderRadius={0}
      />
      <div className="sb-cover-postcards">
        <div className="sb-cover-postcard">
          <EditorialImageSlot
            slotId="cover-sub-1"
            image={images["cover-sub-1"]}
            onUpload={onImageUpload}
            onRemove={onImageRemove}
            caption={data.destinations?.[1] || "Local culture"}
            borderRadius={18}
          />
        </div>
        <div className="sb-cover-postcard sb-cover-postcard--small">
          <EditorialImageSlot
            slotId="cover-sub-2"
            image={images["cover-sub-2"]}
            onUpload={onImageUpload}
            onRemove={onImageRemove}
            caption={data.destinations?.[2] || "Extraordinary landscapes"}
            borderRadius={18}
          />
        </div>
      </div>
    </div>
  </BrochurePage>
);
