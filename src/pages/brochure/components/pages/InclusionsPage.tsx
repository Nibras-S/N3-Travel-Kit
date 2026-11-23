import { Check, ClipboardList, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BrochureData } from "../../types";
import {
  BrochureBrand,
  BrochureFooter,
  BrochurePage,
  FitContent,
} from "./BrochureDesign";

interface InclusionsPageProps {
  data: BrochureData;
  pageNumber: number;
  totalPages: number;
}

const PackageSectionHeader = ({
  number,
  label,
  title,
  icon: Icon,
}: {
  number: string;
  label: string;
  title: string;
  icon: LucideIcon;
}) => (
  <header className="sb-package-header">
    <span className="sb-package-icon" aria-hidden="true">
      <Icon strokeWidth={1.6} />
    </span>
    <div className="sb-package-header-copy">
      <p className="sb-eyebrow">
        <span className="sb-section-number">{number}</span> / {label}
      </p>
      <h3>{title}</h3>
    </div>
  </header>
);

export const InclusionsPage = ({
  data,
  pageNumber,
  totalPages,
}: InclusionsPageProps) => {
  const inclusions = data.inclusions || [];
  const exclusions = data.exclusions || [];
  const bookingTerms = data.bookingTerms || [];
  const sectionCount = [inclusions, exclusions, bookingTerms].filter(
    (items) => items.length > 0,
  ).length;
  const gridClass = sectionCount === 1 ? " sb-essentials-grid--one" :
    sectionCount === 2 ? " sb-essentials-grid--two" : "";

  return (
    <BrochurePage className="sb-page--essentials">
      <header className="sb-running-header">
        <BrochureBrand compact />
        <span className="sb-eyebrow">A thoughtfully planned escape</span>
      </header>

      <FitContent className="sb-essentials-fit">
        <div className="sb-essentials-intro">
          <h2 className="sb-heading">Your journey.<br />The finer details.</h2>
          <p className="sb-body">
            What’s included, what to plan for, and everything to know before you go.
          </p>
        </div>

        <div className={`sb-essentials-grid${gridClass}`}>
          {inclusions.length > 0 && (
            <section className="sb-package-section sb-package-section--included">
              <PackageSectionHeader
                number="01"
                label="Inclusions"
                title="We’ve got it covered."
                icon={Check}
              />
              <ul className="sb-package-list">
                {inclusions.map((item, index) => (
                  <li key={index}>
                    <span className="sb-package-marker" aria-hidden="true">
                      <Check />
                    </span>
                    <span className="sb-package-item-text">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {exclusions.length > 0 && (
            <section className="sb-package-section sb-package-section--excluded">
              <PackageSectionHeader
                number="02"
                label="Exclusions"
                title="A little extra to plan for."
                icon={Minus}
              />
              <ul className="sb-package-list">
                {exclusions.map((item, index) => (
                  <li key={index}>
                    <span className="sb-package-marker" aria-hidden="true">
                      <Minus />
                    </span>
                    <span className="sb-package-item-text">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bookingTerms.length > 0 && (
            <section className="sb-package-section sb-package-section--terms">
              <PackageSectionHeader
                number="03"
                label="Booking terms"
                title="Good to know."
                icon={ClipboardList}
              />
              <ol className="sb-booking-list">
                {bookingTerms.map((term, index) => (
                  <li key={index}>
                    <span className="sb-booking-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="sb-booking-text">{term}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </FitContent>

      <BrochureFooter
        label="Package essentials"
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </BrochurePage>
  );
};
