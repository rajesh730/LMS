export function WritingTags({ tags = [], className = "" }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-[#dfe4ee] bg-[#f7f8fc] px-3 py-1 text-xs font-bold text-[#526071]"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

export function WritingCover({ coverImage, title = "Writing", className = "" }) {
  if (!coverImage?.url) return null;

  return (
    <figure className={`overflow-hidden rounded-xl bg-[#f3f5f9] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImage.url}
        alt={coverImage.altText || coverImage.alt || `${title} cover`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </figure>
  );
}

export function WritingGallery({ images = [], title = "Writing", className = "" }) {
  if (!Array.isArray(images) || images.length === 0) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {images.map((image, index) => (
        <figure key={image.asset || image.url || index} className="overflow-hidden rounded-xl bg-[#f3f5f9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.altText || image.alt || `${title} image ${index + 1}`}
            loading="lazy"
            className="h-auto max-h-[34rem] w-full object-contain"
          />
          {image.caption && (
            <figcaption className="px-3 py-2 text-xs text-[#667085]">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
