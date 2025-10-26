
// Manifest do PWA FR TRANSPORTES
export const manifest = {
  name: "FR TRANSPORTES & Serviços",
  short_name: "FR TRANSPORTES",
  description: "Sistema completo de gestão de transportes e serviços",
  start_url: "/",
  display: "standalone",
  orientation: "portrait",
  theme_color: "#00ff66",
  background_color: "#0f0f0f",
  scope: "/",
  icons: [
    {
      src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    }
  ],
  categories: ["business", "productivity"],
  lang: "pt-BR",
  dir: "ltr"
};
