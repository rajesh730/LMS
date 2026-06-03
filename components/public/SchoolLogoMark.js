"use client";

import { useState } from "react";
import { FaSchool } from "react-icons/fa";
import { normalizeImageUrl } from "@/lib/imageUrls";

export default function SchoolLogoMark({
  imageUrl,
  name = "School",
  className = "h-10 w-10",
  iconClassName = "",
  shapeClassName = "rounded-full",
}) {
  const [failedImage, setFailedImage] = useState("");
  const image = normalizeImageUrl(imageUrl);
  const failed = Boolean(image && failedImage === image);
  const initial = String(name || "S").charAt(0).toUpperCase();

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-[#edf0f7] bg-white text-[#4326e8] ${shapeClassName} ${className}`.trim()}
    >
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-full w-full object-contain p-1"
          onError={() => setFailedImage(image)}
        />
      ) : initial ? (
        <span className="text-sm font-black">{initial}</span>
      ) : (
        <FaSchool className={iconClassName} />
      )}
    </span>
  );
}
