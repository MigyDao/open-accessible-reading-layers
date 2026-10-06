import type { Metadata } from "next";

import "./styles.css";

export const metadata: Metadata = {
  title: "Open Accessible Reading Layers — Reference Reader",
  description:
    "Reference implementation for reader-controlled Open Reading Layers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
