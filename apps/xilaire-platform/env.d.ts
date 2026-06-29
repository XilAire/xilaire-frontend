// apps/xilaire-platform/env.d.ts

declare namespace NodeJS {
  interface ProcessEnv {
    // --- Supabase (Platform) ---
    NEXT_PUBLIC_SUPABASE_URL_PLATFORM: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM: string;
    SUPABASE_SERVICE_ROLE_KEY_PLATFORM: string;

    // --- Contact Form Email Settings ---
    CONTACT_EMAIL_USER: string;     // support@xilairetechnologies.com
    CONTACT_EMAIL_PASS: string;     // App password or Office365 SMTP password
    SUPPORT_INBOX_EMAIL?: string;   // Default: support@xilairetechnologies.com

    // --- Node Environment ---
    NODE_ENV: "development" | "production" | "test";
  }
}
