import "./globals.css";

export const metadata = {
  title: "Matrix Studio | 30x10 WS2812 LED Matrix Controller",
  description: "Cyberpunk web control studio and dashboard for 30x10 (300 LEDs) addressable RGB matrix driven by ESP32.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
