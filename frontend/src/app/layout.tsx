import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pitch Angle Finder",
  description: "Generate realistic PR pitch angles for a company or product, powered by Groq.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
