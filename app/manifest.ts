import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Turnieje",
    short_name: "Turnieje",
    description: "Organizacja turniejów sportowych",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#b6f24e",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
