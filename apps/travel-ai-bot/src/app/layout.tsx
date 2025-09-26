import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";

export const metadata: Metadata = {
  title: "Realtime API Agents",
  description: "A demo app from OpenAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="ta-theme" suppressHydrationWarning>
      <body className={`antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('ta_theme_v4')||'warm';var r=document.documentElement;if(!r.classList.contains('ta-theme')) r.classList.add('ta-theme');var a=[];r.classList.forEach(function(c){if(c.indexOf('ta-theme-')===0)a.push(c)});a.forEach(function(c){r.classList.remove(c)});r.classList.add('ta-theme-'+t);}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
