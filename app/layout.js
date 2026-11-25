import "./globals.css";

export const metadata = {
  title: "Finanças & ADS",
  description: "Painel pessoal de finanças e performance de anúncios"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
