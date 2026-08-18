import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Delivery layer only: NextAuth's HTTP surface. The configuration itself lives
// in `lib/authOptions.js` so that lower layers (`lib/authz.js` and friends) can
// import it without depending on `app/` — see `docs/ARCHITECTURE.md` §2.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
