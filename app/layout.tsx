import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { isAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";
import ThemeToggle from "@/components/ThemeToggle";

const grotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Turnieje",
  description: "Organizacja turniejów sportowych",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  return (
    <html lang="pl" className={`${grotesk.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('turnieje-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}",
          }}
        />
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0b0d12" strokeWidth="2.6" strokeLinecap="round">
                <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                <path d="M12 14v4M8 20h8" />
              </svg>
            </span>
            TURNIEJE
          </Link>
          <nav className="topnav">
            {admin ? (
              <>
                <span className="mono nav-user" title="Zalogowano jako organizator">
                  <span className="dot dot-accent" />
                  <span className="nav-user-label"> organizator</span>
                </span>
                <form action={logoutAction} className="inline-form" suppressHydrationWarning>
                  <button type="submit" className="secondary mini" style={{ marginTop: 0 }}>
                    Wyloguj
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="nav-link">
                Logowanie organizatora
              </Link>
            )}
            <ThemeToggle />
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer mono">
          <span>TURNIEJE · v1.0</span>
        </footer>
      </body>
    </html>
  );
}
