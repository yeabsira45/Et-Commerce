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
            <Link className="footerLink" href="/about">
              About ET-Commerce Classifieds
            </Link>
            <Link className="footerLink" href="/terms">
              Terms &amp; Conditions
            </Link>
            <Link className="footerLink" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="footerLink" href="/cookies">
              Cookie Policy
            </Link>
            <Link className="footerLink" href="/copyright">
              Copyright Infringement Policy
            </Link>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Support</h3>
            <a href="mailto:support@commerceet.com" className="footerLink">
              support@commerceet.com
            </a>
            <Link className="footerLink" href="/safety">
              Safety tips
            </Link>
            <Link className="footerLink" href="/contact">
              Contact us
            </Link>
            <Link className="footerLink" href="/faq">
              FAQ
            </Link>
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
            <a className="footerLink" href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              Our Facebook
            </a>
            <a className="footerLink" href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              Our Instagram
            </a>
            <a className="footerLink" href="https://youtube.com" target="_blank" rel="noopener noreferrer">
              Our YouTube
            </a>
            <a className="footerLink" href="https://x.com" target="_blank" rel="noopener noreferrer">
              Our Twitter
            </a>
          </div>

          <div className="footerCol">
            <h3 className="footerHeading">Hot links</h3>
            <Link className="footerLink" href="/">
              ET-Commerce
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
      </div>
    </footer>
  );
}
