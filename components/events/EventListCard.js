export default function EventListCard({ children, accent = "blue" }) {
  const hoverBorder =
    accent === "purple" ? "hover:border-purple-200" : "hover:border-[#b9c9eb]";

  return (
    <article
      className={`overflow-hidden rounded-xl border border-[#dfe7f3] bg-white shadow-sm transition ${hoverBorder} hover:shadow-md`}
    >
      {children}
    </article>
  );
}
