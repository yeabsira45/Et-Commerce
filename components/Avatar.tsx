"use client";

import React, { useEffect, useState } from "react";

type Props = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

export function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function getAvatarGradient(name: string) {
  const seed = Array.from(name).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  const hueA = seed % 360;
  const hueB = (hueA + 55 + (seed % 70)) % 360;
  const hueC = (hueA + 135 + (seed % 45)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 72% 46%), hsl(${hueB} 78% 58%), hsl(${hueC} 74% 52%))`;
}

export function Avatar({ name, imageUrl, size = 40, className = "" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
  }, [mounted]);

  if (!mounted) {
    return (
      <span
        className={`avatarCircle avatarFallback ${className}`.trim()}
        style={{ width: size, height: size, backgroundImage: getAvatarGradient(name) }}
        aria-label={name}
      >
        {getInitials(name)}
      </span>
    );
  }

  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`avatarCircle ${className}`.trim()} style={{ width: size, height: size }} />;
  }

  return (
    <span
      className={`avatarCircle avatarFallback ${className}`.trim()}
      style={{ width: size, height: size, backgroundImage: getAvatarGradient(name) }}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
