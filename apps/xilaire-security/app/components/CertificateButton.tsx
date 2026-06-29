// apps/xilaire-security/app/components/CertificateButton.tsx
"use client";

import { useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

const supabase = createClient(URL, ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type Props = {
  courseId: string;
  courseTitle: string;
};

export default function CertificateButton({ courseId, courseTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Get session
      const { data: sessData } = await supabase.auth.getSession();
      const session: Session | null = sessData.session ?? null;

      if (!session) {
        setError("You must be signed in to download your certificate.");
        return;
      }

      const userId = session.user.id;

      // 2) Get student name from profiles (fallback to email)
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        console.error("Profile lookup error:", profileErr);
      }

      const studentName =
        profileRow?.full_name ||
        (session.user.user_metadata?.full_name as string | undefined) ||
        session.user.email ||
        "Student";

      // 3) Verify they are actually enrolled & completed (RLS limits to this user)
      const { data: enrollRow, error: enrollErr } = await supabase
        .from("enrollments")
        .select("progress, completed_at")
        .eq("course_id", courseId)
        .maybeSingle();

      if (enrollErr) {
        console.error("Enrollment lookup error:", enrollErr);
      }

      const progress = enrollRow?.progress ?? 0;
      if (progress < 100) {
        setError(
          "You must complete the course before downloading a certificate."
        );
        return;
      }

      const completedAt = enrollRow?.completed_at
        ? new Date(enrollRow.completed_at)
        : new Date();

      // 4) Generate PDF with jsPDF
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(2);
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60);

      // Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.text("Certificate of Completion", pageWidth / 2, 120, {
        align: "center",
      });

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text("This certifies that", pageWidth / 2, 170, {
        align: "center",
      });

      // Student name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text(studentName, pageWidth / 2, 210, { align: "center" });

      // Course text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text("has successfully completed the course", pageWidth / 2, 250, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(courseTitle, pageWidth / 2, 285, { align: "center" });

      // Date & ID
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      const dateStr = completedAt.toLocaleDateString();
      doc.text(`Date: ${dateStr}`, pageWidth / 2, 330, { align: "center" });

      // Simple deterministic certificate ID
      const shortId = `${userId.slice(0, 8)}-${courseId.slice(0, 8)}`;
      doc.text(`Certificate ID: ${shortId}`, pageWidth / 2, 350, {
        align: "center",
      });

      // Footer / provider
      doc.setFontSize(10);
      doc.text(
        "Issued by XilAire Security Training Platform",
        pageWidth / 2,
        pageHeight - 60,
        { align: "center" }
      );

      // 5) Trigger download
      const safeTitle = courseTitle.replace(/[^a-z0-9]+/gi, "-");
      doc.save(`Certificate-${safeTitle}.pdf`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while generating the certificate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1.5 rounded-md border text-xs font-medium bg-white hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? "Generating…" : "Download certificate"}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
