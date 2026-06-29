"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!
);

export default function StudentNavbar() {
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="w-full border-b bg-white px-4 py-3 shadow-sm flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold">
        XilAire Security
      </Link>

      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="hover:underline">
          Dashboard
        </Link>

        <Link href="/certificates" className="hover:underline">
          My Certificates
        </Link>

        <Link href="/profile" className="hover:underline">
          Profile
        </Link>

        <button
          onClick={logout}
          className="rounded border px-3 py-1 hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
