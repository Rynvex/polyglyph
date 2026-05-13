import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TranslationFooter } from "@/components/TranslationFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polyglyph — Type your way to a new language",
  description:
    "Practice real conversations in any language by typing scripted dialogues. Offline-friendly, zero-LLM, designed for daily reps.",
};

// Inline script that resolves the user's stored theme preference (or falls
// back to the OS prefers-color-scheme) BEFORE React hydrates, so the page
// never paints in the wrong theme. Compresses to a few hundred bytes; runs
// once per page load.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('polyglyph:theme');
    var pref = (stored === 'light' || stored === 'dark' || stored === 'auto') ? stored : 'auto';
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    var resolved = pref === 'auto' ? (prefersLight ? 'light' : 'dark') : pref;
    document.documentElement.dataset.theme = resolved;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-fg">
        {children}
        <TranslationFooter />
      </body>
    </html>
  );
}
