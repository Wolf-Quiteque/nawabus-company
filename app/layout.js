import "./globals.css";

export const metadata = {
  title: "Portal da Empresa - Nawabus",
  description: "Portal de gestão para funcionários da empresa",
};

export default function RootLayout({ children }) {
  // Root layout is intentionally minimal. Auth and sidebar are handled by per-route layouts.
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
