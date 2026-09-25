import { LoginPage } from "./LoginPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return <LoginPage error={error} next={next} />;
}
