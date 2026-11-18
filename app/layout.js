
export const metadata = {
  title: "Business Hub Fiji",
  description:
    "Connecting People. Empowering Businesses. Building the Digital Economy."
};

// Quick-access bar fixed to the bottom of every page.
const WHATSAPP_LINK =
  "https://wa.me/6799211153?text=" +
  encodeURIComponent("Bula Business Hub Fiji! I'd like to join the mall.");

const btn = {
  flex: 1,
  maxWidth: 200,
  textAlign: "center",
  padding: "12px 8px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 15,
  textDecoration: "none"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "Arial, sans-serif",
        background: "#f5f7fa",
        paddingBottom: 76
      }}>
        {children}
        <nav aria-label="Quick access" style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          gap: 10,
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          background: "#10213c",
          boxShadow: "0 -4px 16px rgba(0,0,0,.2)"
        }}>
          <a href="/" style={{ ...btn, background: "#ffffff", color: "#10213c" }}>
            Browse
          </a>
          <a href="/join" style={{ ...btn, background: "#e8c879", color: "#10213c" }}>
            Register
          </a>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener" style={{ ...btn, background: "#1fa855", color: "#ffffff" }}>
            WhatsApp us
          </a>
        </nav>
      </body>
    </html>
  );
}
