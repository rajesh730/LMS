import Link from "next/link";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaClock,
  FaUser,
} from "react-icons/fa";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicShareButton from "@/components/public/PublicShareButton";
import SchoolLogoMark from "@/components/public/SchoolLogoMark";
import WritingContent, { stripWritingMarkup } from "@/components/WritingContent";
import AppDate from "@/components/common/AppDate";
import {
  getAuthoredSchoolName,
  formatAuthoredEra,
} from "@/lib/writingProvenance";

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getPreview(content = "", maxLength = 96) {
  const text = stripWritingMarkup(content).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function PublicWritingReader({
  article,
  relatedArticles = [],
  moreFromSchool = [],
  backHref = "/",
  backLabel = "Back to Home",
  currentHref = "",
  relatedHrefPrefix = "/writings/",
}) {
  const author = article.authorStudent || {};
  const school = article.school || {};
  const schoolHref = school.id ? `/schools/${school.id}` : "/schools";
  const shareHref = currentHref || `/writings/${article.id}`;
  const moreItems = moreFromSchool.length > 0 ? moreFromSchool : relatedArticles;
  // Label by where + when it was written (authoring-era snapshot), so a piece
  // reads as history after the author transfers. The link still points to the
  // origin school that owns it.
  const schoolName = getAuthoredSchoolName(article, school.schoolName);
  const authoredEra = formatAuthoredEra(article);
  const currentSchoolId = author.currentSchoolId || "";
  // Only surface "now at X" when the author has moved on — otherwise it just
  // repeats the "written at X" provenance shown in the footer.
  const currentSchoolName =
    currentSchoolId && currentSchoolId !== school.id
      ? author.currentSchoolName || ""
      : "";

  return (
    <div className="public-reader-shell mx-auto max-w-[1500px] px-0 py-5 pb-16 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="home" />

        <main className="min-w-0">
          <article className="mobile-full-bleed-card rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm font-black text-[#4326e8]"
              >
                <FaArrowLeft />
                {backLabel}
              </Link>
              <PublicShareButton
                href={shareHref}
                title={article.title}
                label="Share Story"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
              />
            </div>

            <div className="mt-8 max-w-4xl">
              <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black uppercase text-[#4326e8]">
                {getCategoryLabel(article.category)}
              </span>
              <h1 className="mt-4 break-words text-4xl font-black leading-tight text-[#10142f] md:text-5xl">
                {article.title}
              </h1>

              {/* Author-first byline: the piece is the person's, so the person
                  leads. Their current school is their identity ("now at"); the
                  school it was written at is provenance, shown at the bottom. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-[#526071]">
                {author.id ? (
                  <Link
                    href={`/students/${author.id}`}
                    className="inline-flex items-center gap-2 text-base font-black text-[#10142f] hover:text-[#4326e8]"
                  >
                    <FaUser className="text-[#4326e8]" />
                    {author.name || "Student"}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-base font-black text-[#10142f]">
                    <FaUser className="text-[#4326e8]" />
                    {author.name || "Student"}
                  </span>
                )}
                {currentSchoolName &&
                  (currentSchoolId ? (
                    <Link
                      href={`/schools/${currentSchoolId}`}
                      className="inline-flex items-center gap-2 hover:text-[#4326e8]"
                    >
                      <SchoolLogoMark
                        imageUrl={author.currentSchoolLogoUrl}
                        name={currentSchoolName}
                        className="h-6 w-6"
                        iconClassName="text-xs"
                        shapeClassName="rounded-md"
                      />
                      Now at {currentSchoolName}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <SchoolLogoMark
                        imageUrl={author.currentSchoolLogoUrl}
                        name={currentSchoolName}
                        className="h-6 w-6"
                        iconClassName="text-xs"
                        shapeClassName="rounded-md"
                      />
                      Now at {currentSchoolName}
                    </span>
                  ))}
                <span className="inline-flex items-center gap-2">
                  <FaCalendarAlt className="text-[#4326e8]" />
                  <AppDate value={article.publishedAt} />
                </span>
                <span className="inline-flex items-center gap-2">
                  <FaClock className="text-[#4326e8]" />
                  {getReadTime(article.content)} min read
                </span>
              </div>
            </div>

            <WritingContent
              content={article.content}
              className="public-reader-content mx-auto mt-10 max-w-3xl text-lg leading-7 text-[#27344a]"
            />

            {/* Provenance footer: where + when this piece was written. Links to
                the origin school that owns it — kept distinct from the author's
                current school shown in the byline above. */}
            <div className="mt-10 flex flex-col gap-4 border-t border-[#edf0f7] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={schoolHref}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#e6eaf7] bg-[#fbfcff] p-3 pr-5 transition hover:border-[#cfc7ff] hover:bg-[#f8f7ff]"
              >
                <SchoolLogoMark
                  imageUrl={school.profile?.coverImageUrl}
                  name={schoolName}
                  className="h-14 w-14"
                  iconClassName="text-2xl"
                  shapeClassName="rounded-xl"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase text-[#6f7890]">
                    Written at
                  </span>
                  <span className="block truncate text-base font-black text-[#10142f] group-hover:text-[#4326e8]">
                    {schoolName}
                  </span>
                  {authoredEra && (
                    <span className="block truncate text-xs font-bold text-[#6f7890]">
                      {authoredEra}
                    </span>
                  )}
                </span>
              </Link>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={schoolHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
                >
                  School Profile
                  <FaArrowRight />
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white public-primary-action transition hover:bg-[#3217d3]"
                >
                  More Stories
                  <FaArrowRight />
                </Link>
              </div>
            </div>
          </article>

          {moreItems.length > 0 && (
            <section className="mobile-full-bleed-card mt-5 rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#10142f]">
                  More from this school
                </h2>
                <Link href={schoolHref} className="text-sm font-black text-[#4326e8]">
                  View school
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {moreItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`${relatedHrefPrefix}${item.id}`}
                    className="rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-4 transition hover:bg-white"
                  >
                    <span className="text-xs font-black uppercase text-[#4326e8]">
                      {getCategoryLabel(item.category)}
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#10142f]">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#526071]">
                      {getPreview(item.content)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
