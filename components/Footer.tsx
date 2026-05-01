import React from "react";
import Image from "next/image";
import Link from "next/link";

const REGIONS = [
  { name: "Afar", flag: "/flags/afar.webp", colors: ["#FFD700", "#DA121A"] },
  { name: "Amhara", flag: "/flags/amhara.webp", colors: ["#078930", "#FCDD09", "#DA121A"] },
  { name: "Benishangul-Gumuz", flag: "/flags/benishangul-gumuz.webp", colors: ["#078930", "#DA121A"] },
  { name: "Gambela", flag: "/flags/gambela.webp", colors: ["#078930", "#DA121A"] },
  { name: "Harari", flag: "/flags/harari.webp", colors: ["#078930", "#DA121A"] },
  { name: "Oromia", flag: "/flags/oromia.webp", colors: ["#078930", "#DA121A"] },
  { name: "Sidama", flag: "/flags/sidama.webp", colors: ["#009A44", "#FCDD09", "#DA121A"] },
  { name: "SNNPR", flag: "/flags/snnpr.webp", colors: ["#078930", "#DA121A"] },
  { name: "Somali", flag: "/flags/somali.webp", colors: ["#078930", "#DA121A"] },
  { name: "Southwest", flag: "/flags/southwest.webp", colors: ["#078930", "#DA121A"] },
  { name: "Tigray", flag: "/flags/tigray.webp", colors: ["#FFD700", "#C8102E"] },
];

export function Footer() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerColumns footerColumnsHero">
          <div className="footerCol">
            <h3 className="footerHeading footerBrandHeading">ET-Commerce</h3>
            <div className="footerFeatureList">
              <Link className="footerLink footerFeatureLink" href="/safety">
                <span className="footerFeatureIcon" aria-hidden="true">🛡</span>
                <span>Safe &amp; Secure</span>
              </Link>
              <Link className="footerLink footerFeatureLink" href="/contact">
                <span className="footerFeatureIcon" aria-hidden="true">🎧</span>
                <span>24/7 Support</span>
              </Link>
              <Link className="footerLink footerFeatureLink" href="/privacy">
                <span className="footerFeatureIcon" aria-hidden="true">📄</span>
                <span>Privacy Policy</span>
              </Link>
            </div>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Download Our App</h3>
            <button type="button" className="footerStoreBadge" aria-label="Download on App Store">
              <span className="footerStoreBadgeSub">Download on the</span>
              <span className="footerStoreBadgeMain">App Store</span>
            </button>
            <button type="button" className="footerStoreBadge" aria-label="Get it on Google Play">
              <span className="footerStoreBadgeSub">Get it on</span>
              <span className="footerStoreBadgeMain">Google Play</span>
            </button>
            <div className="footerSocialRow">
              <a className="footerSocialBtn" href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a>
              <a className="footerSocialBtn" href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">◎</a>
              <a className="footerSocialBtn" href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">▶</a>
              <a className="footerSocialBtn" href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">𝕏</a>
            </div>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Explore More</h3>
            <Link className="footerLink" href="/about">
              About Us
            </Link>
            <Link className="footerLink" href="/faq">
              FAQs
            </Link>
            <Link className="footerLink" href="/contact">
              Contact Us
            </Link>
          </div>
        </div>

<div className="footerFlags" aria-label="Available regions">
  {REGIONS.map((region) => (
    <button
      key={region.name}
      type="button"
      className="footerFlag"
      aria-label={region.name}
    >
      <Image
        src={region.flag}
        alt={`${region.name} flag`}
        className="footerFlagImage"
        width={20}
        height={15}
      />
      <span className="footerTooltip">{region.name}</span>
    </button>
  ))}
</div>
        <div className="footerCopy">© 2026 ET-Commerce.com</div>
      </div>
    </footer>
  );
}
