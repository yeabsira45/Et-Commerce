import React from "react";

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
      <div className="footerSkyline" aria-hidden="true">
        <div className="footerBuilding footerBuilding--short" />
        <div className="footerBuilding footerBuilding--tall" />
        <div className="footerBuilding footerBuilding--medium" />
        <div className="footerBuilding footerBuilding--tall" />
        <div className="footerBuilding footerBuilding--short" />
        <div className="footerBuilding footerBuilding--medium" />
        <div className="footerBuilding footerBuilding--tall" />
        <div className="footerBuilding footerBuilding--short" />
      </div>

      <div className="container footerInner">
        <div className="footerColumns">
          <div className="footerCol">
            <h3 className="footerHeading">About us</h3>
            <a href="#" className="footerLink">
              About ET-Commerce Classifieds
            </a>
            <a href="#" className="footerLink">
              Terms &amp; Conditions
            </a>
            <a href="#" className="footerLink">
              Privacy Policy
            </a>
            <a href="#" className="footerLink">
              Cookie Policy
            </a>
            <a href="#" className="footerLink">
              Copyright Infringement Policy
            </a>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Support</h3>
            <a href="mailto:support@et-commerce.com" className="footerLink">
              support@et-commerce.com
            </a>
            <a href="#" className="footerLink">
              Safety tips
            </a>
            <a href="#" className="footerLink">
              Contact us
            </a>
            <a href="#" className="footerLink">
              FAQ
            </a>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">How it works</h3>
            <p className="modalSub" style={{ margin: 0 }}>
              ET-Commerce connects buyers and sellers directly.
            </p>
            <p className="modalSub" style={{ margin: 0 }}>
              Message or call the seller, meet safely, and agree on details in person.
            </p>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Our resources</h3>
            <a href="#" className="footerLink">
              Our Facebook
            </a>
            <a href="#" className="footerLink">
              Our Instagram
            </a>
            <a href="#" className="footerLink">
              Our YouTube
            </a>
            <a href="#" className="footerLink">
              Our Twitter
            </a>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Hot links</h3>
            <a href="#" className="footerLink">
              ET-Commerce
            </a>
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
      <img
        src={region.flag}
        alt={`${region.name} flag`}
        className="footerFlagImage"
      />
      <span className="footerTooltip">{region.name}</span>
    </button>
  ))}
</div>
      </div>
    </footer>
  );
}

