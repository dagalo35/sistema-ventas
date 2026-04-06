export const metadata = {
  title: "Mi App",
  description: "App con Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}