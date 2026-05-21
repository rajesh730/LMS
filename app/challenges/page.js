import { redirect } from "next/navigation";

export const metadata = {
  title: "Pratyo Public Platform",
  description: "Student talent, school recognition, and public events",
};

export default function PublicChallengesRedirectPage() {
  redirect("/");
}
