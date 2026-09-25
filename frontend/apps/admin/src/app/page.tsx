import { redirect } from "next/navigation";
import { getServerMe, getServerSessions } from "@/lib/getServerAdmin";
import { DashboardPage } from "./DashboardPage";

export default async function Page() {
  const [me, sessions] = await Promise.all([getServerMe(), getServerSessions()]);
  if (!me) redirect("/login?error=sessionExpired");
  return <DashboardPage me={me} sessions={sessions ?? []} />;
}
