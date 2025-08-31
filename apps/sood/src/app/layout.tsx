import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { CartProvider } from "@/app/contexts/CartContext";

export const metadata: Metadata = {
  title: "TicketHub - Your Event Marketplace",
  description: "Buy and sell event tickets safely and securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
