import Image from "next/image";
import clsx from "clsx";
import pravyoLogo from "@/logo/pravyo logo by name.png";

export default function PravyoLogo({
  compact = false,
  iconOnly = false,
  variant,
  withSurface = false,
  className = "",
  imageClassName = "",
  textClassName = "",
  subtitle = "",
}) {
  const resolvedVariant = variant || (iconOnly ? "icon" : "wordmark");
  const assets = {
    icon: {
      src: pravyoLogo,
      alt: "Pravyo icon",
      width: compact ? 40 : 52,
      height: compact ? 40 : 52,
    },
    wordmark: {
      src: pravyoLogo,
      alt: "Pravyo",
      width: compact ? 126 : 220,
      height: compact ? 34 : 60,
    },
    lockup: {
      src: pravyoLogo,
      alt: "Pravyo logo",
      width: compact ? 152 : 260,
      height: compact ? 152 : 260,
    },
  };

  const asset = assets[resolvedVariant] || assets.wordmark;
  const shouldShowSubtitle = Boolean(subtitle);

  return (
    <span className={clsx("inline-flex flex-col gap-2", className)}>
      <span
        className={clsx(
          "inline-flex w-fit items-center justify-center",
          withSurface &&
            (resolvedVariant === "icon"
              ? "rounded-xl bg-white p-2 shadow-lg shadow-black/20"
              : "rounded-2xl bg-white px-4 py-3 shadow-xl shadow-black/20")
        )}
      >
        <Image
          src={asset.src}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          className={clsx("h-auto w-auto", imageClassName, textClassName)}
          priority
        />
      </span>
      {shouldShowSubtitle ? (
        <span
          className={clsx(
            "pl-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8dffd]",
            textClassName
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
