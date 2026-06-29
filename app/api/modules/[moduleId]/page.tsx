// app/modules/[moduleId]/page.tsx
import ModulePlayer from "@/components/ModulePlayer";

type Props = { params: { moduleId: string } };

export default async function ModulePage({ params }: Props) {
  // TODO: fetch module from Supabase if you want dynamic src
  // For now, hardcode a test video:
  const src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  return <ModulePlayer module_id={params.moduleId} src={src} />;
}
