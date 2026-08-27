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

// Mongoose subdocuments carry ObjectIds (and a toJSON method), which React
// refuses to hand from a Server Component to a Client Component. Everything the
// media components render is a plain string, so flatten to that.
export function serializeWritingImage(image) {
  if (!image?.url) return null;
  return {
    url: String(image.url),
    caption: String(image.caption || ""),
    altText: String(image.altText || image.alt || ""),
  };
}

export function serializeWritingImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map(serializeWritingImage).filter(Boolean);
}

export function getWritingLeadImage(coverImage, images = []) {
  if (coverImage?.url) return coverImage;
  return Array.isArray(images) ? images.find((image) => image?.url) || null : null;
}

// The lead image is rendered at the top of a writing, so the gallery under the
// text must not repeat it.
export function getWritingBodyImages(coverImage, images = []) {
  if (!Array.isArray(images)) return [];
  const lead = getWritingLeadImage(coverImage, images);
  if (!lead) return images.filter((image) => image?.url);
  return images.filter(
    (image) =>
      image?.url &&
      !(image === lead || (image.asset && image.asset === lead.asset) || image.url === lead.url)
  );
}

export function WritingCover({ coverImage, images = [], title = "Writing", className = "" }) {
  const leadImage = getWritingLeadImage(coverImage, images);
  if (!leadImage?.url) return null;

  return (
    <figure className={`overflow-hidden rounded-xl bg-[#f3f5f9] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={leadImage.url}
        alt={leadImage.altText || leadImage.alt || `${title} cover`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </figure>
  );
}

export function WritingGallery({
  images = [],
  coverImage = null,
  title = "Writing",
  className = "",
}) {
  const galleryImages = getWritingBodyImages(coverImage, images);
  if (galleryImages.length === 0) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {galleryImages.map((image, index) => (
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
