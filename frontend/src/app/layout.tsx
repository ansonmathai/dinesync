import "./globals.css";

export const metadata = {
  title: "A M Foods Admin",
  description: "Kitchen Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}