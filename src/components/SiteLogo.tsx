import React from "react";
import {
  Server,
  Shield,
  Zap,
  Cpu,
  Globe,
  Terminal,
  Cloud,
  Database,
  Lock,
  Layers,
  Box,
  Activity,
  Compass,
  Flame,
  HardDrive
} from "lucide-react";

export const ICON_MAP: Record<string, any> = {
  Server,
  Shield,
  Zap,
  Cpu,
  Globe,
  Terminal,
  Cloud,
  Database,
  Lock,
  Layers,
  Box,
  Activity,
  Compass,
  Flame,
  HardDrive
};

export interface SiteBranding {
  siteName: string;
  siteTagline?: string;
  logoType?: "icon" | "image";
  logoIcon?: string;
  logoUrl?: string;
}

interface SiteLogoProps {
  branding?: SiteBranding;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  customTagline?: string;
  className?: string;
  iconBgClass?: string;
  iconColorClass?: string;
}

export default function SiteLogo({
  branding,
  size = "md",
  showTagline = true,
  customTagline,
  className = "",
  iconBgClass = "bg-purple-600",
  iconColorClass = "text-white",
}: SiteLogoProps) {
  const siteName = branding?.siteName || "MagicalNode";
  const siteTagline = customTagline ?? (branding?.siteTagline || "VPS Platforms");
  const logoType = branding?.logoType || "icon";
  const logoIcon = branding?.logoIcon || "Server";
  const logoUrl = branding?.logoUrl || "";

  const IconComponent = ICON_MAP[logoIcon] || Server;

  let containerDimensions = "w-9 h-9";
  let iconSize = "w-5 h-5";
  let textClass = "text-base";
  let taglineClass = "text-[9px]";

  if (size === "sm") {
    containerDimensions = "w-7 h-7";
    iconSize = "w-4 h-4";
    textClass = "text-sm";
    taglineClass = "text-[8px]";
  } else if (size === "lg") {
    containerDimensions = "w-11 h-11";
    iconSize = "w-6 h-6";
    textClass = "text-xl";
    taglineClass = "text-xs";
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoType === "image" && logoUrl ? (
        <div className={`${containerDimensions} rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md`}>
          <img
            src={logoUrl}
            alt={siteName}
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              // Fallback to icon if image URL fails to load
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className={`${containerDimensions} rounded-lg ${iconBgClass} flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0`}>
          <IconComponent className={`${iconSize} ${iconColorClass}`} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <span className={`font-extrabold ${textClass} tracking-tight text-white uppercase truncate block`}>
          {siteName}
        </span>
        {showTagline && siteTagline && (
          <p className={`${taglineClass} text-purple-400 font-bold tracking-widest uppercase -mt-0.5 truncate`}>
            {siteTagline}
          </p>
        )}
      </div>
    </div>
  );
}
