import Image from "next/image";
import clsx from "clsx";
import pratyoIcon from "@/logo/pratyo logo icon.png";
import pratyoWordmark from "@/logo/pratyo logo by name.png";
import pratyoLockup from "@/logo/pratyo full logo.png";

export default function PratyoLogo({
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
      src: pratyoIcon,
      alt: "Pratyo icon",
      width: compact ? 40 : 52,
      height: compact ? 40 : 52,
    },
    wordmark: {
      src: pratyoWordmark,
      alt: "Pratyo",
      width: compact ? 126 : 220,
      height: compact ? 34 : 60,
    },
    lockup: {
      src: pratyoLockup,
      alt: "Pratyo logo",
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
