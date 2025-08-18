import "../styles/globals.css";
import React from "react";
import { AuthProvider } from "../components/AuthProvider";

export const metadata = {
  title: "RAG Admin",
  description: "Admin UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

