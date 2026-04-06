import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { AppProvider } from "@/components/AppContext";
import { ToastProvider } from "@/components/ToastProvider";
import { FloatingSellButton } from "@/components/FloatingSellButton";
import { GlobalHeader } from "@/components/GlobalHeader";

export const metadata: Metadata = {
  title: "ET-Commerce",
  description: "Ethiopian Multivendor E-Commerce site",
  icons: {
    icon: "/favicon.io.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* This meta fixes the halved content issue on mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        <AppProvider>
          <ToastProvider>
            <div className="appShell">
              <GlobalHeader />
              <main className="appMain">{children}</main>
              <FloatingSellButton />
              <Footer />
            </div>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
