import PublicSiteNav from "@/components/public/PublicSiteNav";
import StudentMagazineIssueReader from "@/components/student/StudentMagazineIssueReader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Read School Magazine",
  description: "Read a public school magazine issue",
};

export default async function PublicMagazinePage({ params }) {
  const resolvedParams = await params;

  return (
    <main className="min-h-screen bg-[#f8f9fd] pb-20 text-[#17120a]">
      <PublicSiteNav active="schools" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <StudentMagazineIssueReader
          issueId={resolvedParams.id}
          apiBasePath="/api/public/magazines"
          backHref="/schools"
          backHrefPattern="/schools/{schoolId}#writings"
          backLabel="Back to portfolio"
          articleHrefPrefix={`/magazines/${resolvedParams.id}/articles/`}
        />
      </div>
    </main>
  );
}
