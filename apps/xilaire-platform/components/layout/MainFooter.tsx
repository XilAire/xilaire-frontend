export default function MainFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} XilAire Technologies. All rights reserved.</p>

        <div className="flex gap-4">
          <a href="/legal/terms" className="hover:text-sky-400">
            Terms
          </a>
          <a href="/legal/privacy" className="hover:text-sky-400">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
