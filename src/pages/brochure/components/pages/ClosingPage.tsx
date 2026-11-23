import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import type { BrochureData, BrochureImages } from "../../types";
import {
  BrochureBrand,
  BrochureFooter,
  BrochurePage,
  FitContent,
} from "./BrochureDesign";
import { EditorialImageSlot } from "./EditorialImageSlot";

interface ClosingPageProps {
  data: BrochureData;
  pageNumber: number;
  totalPages: number;
  images: BrochureImages;
  onImageUpload: (slotId: string, dataUrl: string) => void;
  onImageRemove: (slotId: string) => void;
}

export const ClosingPage = ({
  data,
  pageNumber,
  totalPages,
  images,
  onImageUpload,
  onImageRemove,
}: ClosingPageProps) => (
  <BrochurePage className="sb-page--closing">
    <div className="sb-closing-visual">
      <EditorialImageSlot
        slotId="closing-main"
        image={images["closing-main"]}
        onUpload={onImageUpload}
        onRemove={onImageRemove}
        caption="Until the next adventure"
        borderRadius={18}
      />
    </div>

    <div className="sb-closing-copy">
      <header className="sb-running-header">
        <BrochureBrand />
        <span className="sb-eyebrow">Go somewhere memorable</span>
      </header>

      <FitContent className="sb-closing-story">
        <p className="sb-eyebrow">
          {data.closing?.subtitle || "Until we meet again"}
        </p>
        <h2 className="sb-heading">
          {data.closing?.title || "Memories to cherish forever."}
        </h2>
        {data.closing?.body && <p className="sb-body">{data.closing.body}</p>}

        <div className="sb-contact-heading">
          <p className="sb-eyebrow">Let’s plan your next chapter</p>
          <ArrowUpRight aria-hidden="true" />
        </div>
        <div className="sb-contact-grid">
          <div>
            <div className="sb-contact-label">
              <Phone aria-hidden="true" />
              <span>Reservations</span>
            </div>
            <p className="sb-contact-phone">
              {data.contactPhone || "703 448 8235, 963 382 6452"}
            </p>
          </div>
          <div>
            <div className="sb-contact-label">
              <MapPin aria-hidden="true" />
              <span>Find us</span>
            </div>
            <p className="sb-contact-address">
              {data.contactAddress || "Royal Oak Mall, Thana, Kannur"}
            </p>
          </div>
        </div>
      </FitContent>

      <BrochureFooter
        label="www.n3globaltech.com"
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </div>
  </BrochurePage>
);
