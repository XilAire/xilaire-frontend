import type {
  MetadataRoute,
} from "next";

export default function manifest():
  MetadataRoute.Manifest {
  return {
    name:
      "CASE Budget",

    short_name:
      "CASE Budget",

    description:
      "Take control of every dollar with CASE Budget.",

    start_url:
      "/",

    display:
      "standalone",

    background_color:
      "#ffffff",

    theme_color:
      "#10b981",

    orientation:
      "portrait-primary",

    icons: [
      {
        src:
          "/icon-192.png",

        sizes:
          "192x192",

        type:
          "image/png",
      },

      {
        src:
          "/icon-512.png",

        sizes:
          "512x512",

        type:
          "image/png",
      },
    ],
  };
}