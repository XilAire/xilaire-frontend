"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  getStoredExperience,
  setStoredExperience,
  type XilAireExperience,
} from "@/lib/experience";
import { provisionProfile } from "./actions";

function normalizeExperience(
  value: string | null | undefined
): XilAireExperience {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "business") return "business";
  if (normalized === "vendor") return "vendor";
  return "individual";
}

function normalizeString(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : "";
}

function getSignupTitle(experience: XilAireExperience) {
  switch (experience) {
    case "business":
      return "Create Your Business Account";
    case "vendor":
      return "Create Your Vendor Account";
    case "individual":
    default:
      return "Create an Account";
  }
}

function getSignupSubtitle(experience: XilAireExperience) {
  switch (experience) {
    case "business":
      return "Set up your XilAire business experience for services, projects, and subscriptions.";
    case "vendor":
      return "Join the XilAire vendor network to manage bids, site visits, estimates, and invoices.";
    case "individual":
    default:
      return "Create your XilAire account to access services and support.";
  }
}

export default function SignupPage() {
  const searchParams = useSearchParams();

  const [experience, setExperience] =
    useState<XilAireExperience>("individual");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [tradeServices, setTradeServices] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const queryExperience = searchParams.get("experience");
    const storedExperience = getStoredExperience();

    const nextExperience = normalizeExperience(
      queryExperience || storedExperience || "individual"
    );

    setExperience(nextExperience);
    setStoredExperience(nextExperience);
  }, [searchParams]);

  const title = useMemo(() => getSignupTitle(experience), [experience]);
  const subtitle = useMemo(() => getSignupSubtitle(experience), [experience]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const normalizedFirstName = normalizeString(firstName);
    const normalizedLastName = normalizeString(lastName);
    const normalizedEmail = normalizeString(email).toLowerCase();
    const normalizedBusinessName = normalizeString(businessName);
    const normalizedVendorCompanyName = normalizeString(vendorCompanyName);
    const normalizedTradeServices = normalizeString(tradeServices);
    const normalizedPhone = normalizeString(phone);
    const normalizedWebsite = normalizeString(website);
    const normalizedVendorCategory = normalizeString(vendorCategory);

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password ||
      !confirm
    ) {
      return setMessage("All required fields must be completed.");
    }

    if (experience === "business" && !normalizedBusinessName) {
      return setMessage("Business name is required.");
    }

    if (experience === "vendor") {
      if (!normalizedVendorCompanyName) {
        return setMessage("Vendor company name is required.");
      }

      if (!normalizedTradeServices) {
        return setMessage("Trade / services is required.");
      }
    }

    if (password !== confirm) {
      return setMessage("Passwords do not match.");
    }

    setLoading(true);

    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    const companyName =
      experience === "business"
        ? normalizedBusinessName
        : experience === "vendor"
        ? normalizedVendorCompanyName
        : null;

    const vendorTradeServices =
      experience === "vendor" ? normalizedTradeServices : null;

    const vendorPhone = experience === "vendor" ? normalizedPhone : null;
    const vendorWebsite = experience === "vendor" ? normalizedWebsite : null;
    const vendorCategoryValue =
      experience === "vendor" ? normalizedVendorCategory : null;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/reset-password`,
        data: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          full_name: fullName,
          role: "user",
          experience,
          account_type: experience,
          company_name: companyName,
          trade_services: vendorTradeServices,
          phone: vendorPhone,
          website: vendorWebsite,
          vendor_category: vendorCategoryValue,
        },
      },
    });

    if (error) {
      setLoading(false);
      return setMessage(error.message);
    }

    try {
      if (data.user?.id) {
        await provisionProfile({
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          full_name: fullName,
          account_type: experience,
          company_name: companyName,
          trade_services: vendorTradeServices,
          phone: vendorPhone,
          website: vendorWebsite,
          vendor_category: vendorCategoryValue,
        });
      }
    } catch (provisionError) {
      console.error("SIGNUP_PROFILE_PROVISION_ERROR:", provisionError);
      setLoading(false);
      return setMessage(
        provisionError instanceof Error
          ? provisionError.message
          : "Profile provisioning failed."
      );
    }

    setLoading(false);
    setMessage("✓ Check your email to confirm your account.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="flex justify-center mb-6">
          <Image
            src="/icon-light.png"
            alt="XilAire Logo"
            width={72}
            height={72}
            priority
            className="opacity-95"
          />
        </div>

        <div className="text-center mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>

          <p className="text-sm text-slate-400">{subtitle}</p>

          <p className="text-xs text-slate-500 capitalize">
            Experience: {experience}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            className="w-full auth-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last Name"
            className="w-full auth-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          {experience === "business" && (
            <input
              type="text"
              placeholder="Business Name"
              className="w-full auth-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          )}

          {experience === "vendor" && (
            <>
              <input
                type="text"
                placeholder="Vendor Company Name"
                className="w-full auth-input"
                value={vendorCompanyName}
                onChange={(e) => setVendorCompanyName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Trade / Services"
                className="w-full auth-input"
                value={tradeServices}
                onChange={(e) => setTradeServices(e.target.value)}
              />

              <input
                type="text"
                placeholder="Phone (optional)"
                className="w-full auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                type="url"
                placeholder="Website (optional)"
                className="w-full auth-input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />

              <input
                type="text"
                placeholder="Vendor Category (optional)"
                className="w-full auth-input"
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full auth-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button className="auth-btn w-full" disabled={loading} type="submit">
            {loading ? "Creating..." : "Sign Up"}
          </button>

          {message && (
            <p className="text-center text-sm text-slate-300 mt-2">
              {message}
            </p>
          )}
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}