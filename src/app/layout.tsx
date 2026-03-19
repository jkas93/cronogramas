import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Cronograma — Golden Tower Construction",
  description:
    "Sistema de gestión de cronogramas con Diagramas de Gantt, Curva S (EVM), y alertas — Golden Tower Construction SAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable}`}>
      <body className="antialiased min-h-screen font-sans">
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
