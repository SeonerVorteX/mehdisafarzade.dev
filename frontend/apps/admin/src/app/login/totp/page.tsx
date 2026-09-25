import { TotpPage } from "./TotpPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <TotpPage next={next} />;
}
