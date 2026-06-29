import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ExperienceFallback() {
  return (
    <div className="text-center space-y-6">
      <p className="text-slate-600">
        Choose your experience to see tailored services.
      </p>

      <Link href="/#choose-experience">
        <Button>Select experience</Button>
      </Link>
    </div>
  );
}
