import Link from "next/link";

export default function SignOutPage() {
  return (
    <main>
      <h1>
        Signed Out
      </h1>

      <p>
        You have been signed out of CASE Budget.
      </p>

      <Link
        href="/sign-in"
      >
        Sign in again
      </Link>
    </main>
  );
}