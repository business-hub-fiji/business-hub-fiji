
export const metadata = {
  title: "Business Hub Fiji",
  description:
    "Connecting People. Empowering Businesses. Building the Digital Economy."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "Arial, sans-serif",
        background: "#f5f7fa"
      }}>
        {children}
      </body>
    </html>
  );
}
