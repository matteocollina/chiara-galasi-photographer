import type { Metadata } from "next";
import Script from "next/script";
import { Header } from "./components/header";
import "./styles/icomoon.css";
import "./styles/flaticon.css";
import "./styles/bootstrap.min.css";
import "./styles/style.css";
import "./globals.css";
export const metadata: Metadata = {
    metadataBase: new URL("https://chiaragalasi.it"),
    title: "Chiara Galasi Photographer | Sito Web ufficiale",
    description: "Sito ufficiale di Chiara Galasi, appassionata di fotografia.",
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="it"><body>
    <div className="site-wrap"><Header /><main>{children}</main><footer className="footer py-4"><div className="container-fluid text-center"><p>Copyright &copy; 2026 All rights reserved | This website is made with <i className="icon-heart-o" aria-hidden="true"/> by <a href="https://www.linkedin.com/in/matteo-collina/" target="_blank" rel="noopener noreferrer">Matteo Collina</a></p></div></footer></div>
    <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5FCKXKR');`}</Script>
  </body></html>;
}
