import { ReaderShell } from "@/components/reader/ReaderShell";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReaderShell bookId={id} />;
}
