
const services = [
  {
    icon: "🏢",
    title: "Business Directory",
    description: "Discover businesses and services throughout Fiji."
  },
  {
    icon: "🛍️",
    title: "Online Marketplace",
    description: "Buy and sell products from local businesses."
  },
  {
    icon: "🤖",
    title: "BH AI Assistant",
    description: "Get intelligent help to start and grow your business."
  },
  {
    icon: "📈",
    title: "Business Management",
    description: "Manage sales, customers, products and orders."
  },
  {
    icon: "🤝",
    title: "Investment Network",
    description: "Connect entrepreneurs, investors and opportunities."
  },
  {
    icon: "👥",
    title: "Employment Network",
    description: "Connect employers with people seeking work."
  }
];

export default function Home() {
  return (
    <main style={{
      color: "#17243a",
      minHeight: "100vh",
      background: "#f5f7fb"
    }}>
      <header style={{
        background: "#10213c",
        color: "white",
        padding: "22px 6%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div>
          <div style={{
            fontSize: "23px",
            fontWeight: "bold"
          }}>
            BUSINESS HUB FIJI
          </div>
          <small>One Platform. Every Business.</small>
        </div>
        <nav style={{
          display: "flex",
          gap: "18px",
          flexWrap: "wrap"
        }}>
          <a href="#services" style={linkStyle}>Explore</a>
          <a href="#about" style={linkStyle}>About</a>
          <a href="#join" style={linkStyle}>Join Us</a>
        </nav>
      </header>

      <section style={{
        background: "linear-gradient(130deg,#10213c,#174d70)",
        color: "white",
        padding: "85px 7%",
        textAlign: "center"
      }}>
        <p style={{color:"#e8c879",fontWeight:"bold"}}>
          WELCOME TO FIJI'S DIGITAL BUSINESS NETWORK
        </p>
        <h1 style={{
          fontSize: "clamp(36px,7vw, sixty)",
          fontSize: "clamp(36px,7vw,60px)",
          maxWidth: "850px",
          margin: "20px auto",
          lineHeight: 1.15
        }}>
          Connecting People. Empowering Businesses.
        </h1>
        <p style={{
          maxWidth: "650px",
          margin: "20px auto",
          lineHeight: 1.8,
          color: "#dce8f5"
        }}>
          Discover businesses, buy and sell products, grow your
          enterprise and access intelligent business assistance
          all in one digital platform.
        </p>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "30px"
        }}>
          <a href="#services" style={primaryButton}>
            Explore Platform
          </a>
          <a href="#join" style={secondaryButton}>
            Join Business Hub
          </a>
        </div>
      </section>

      <section id="services" style={{
        padding: "65px 6%"
      }}>
        <h2 style={{textAlign:"center",fontSize:"32px"}}>
          Everything Your Business Needs
        </h2>
        <p style={{
          textAlign:"center",
          color:"#64748b",
          marginBottom:"35px"
        }}>
          One connected ecosystem for Fiji.
        </p>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",
          gap:"20px"
        }}>
          {services.map((service) => (
            <article key={service.title} style={{
              background:"white",
              padding:"27px",
              borderRadius:"14px",
              border:"1px solid #e5eaf1"
            }}>
              <div style={{fontSize:"34px"}}>
                {service.icon}
              </div>
              <h3>{service.title}</h3>
              <p style={{
                color:"#64748b",
                lineHeight:1.7
              }}>
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" style={{
        background:"white",
        padding:"55px 8%",
        textAlign:"center"
      }}>
        <h2>Building Fiji's Digital Economy</h2>
        <p style={{
          maxWidth:"700px",
          margin:"15px auto",
          lineHeight:1.8,
          color:"#64748b"
        }}>
          Business Hub Fiji connects individuals, businesses,
          customers, investors and communities through one
          intelligent digital ecosystem.
        </p>
      </section>

      <section id="join" style={{
        padding:"65px 7%",
        background:"#eaf0f7",
        textAlign:"center"
      }}>
        <h2>Become Part of the Network</h2>
        <p>Start building your digital business presence.</p>
        <p style={{color:"#64748b"}}>
          Business registration and customer accounts
          will be activated in our next development stage.
        </p>
      </section>

      <footer style={{
        background:"#10213c",
        color:"white",
        padding:"30px",
        textAlign:"center"
      }}>
        <strong>BUSINESS HUB FIJI</strong>
        <p>Connecting People. Empowering Businesses.</p>
        <small>© 2026 Business Hub Fiji. All rights reserved.</small>
      </footer>
    </main>
  );
}

const linkStyle = {
  color:"white",
  textDecoration:"none"
};

const primaryButton = {
  background:"#e8c879",
  color:"#10213c",
  padding:"14px 23px",
  borderRadius:"7px",
  textDecoration:"none",
  fontWeight:"bold"
};

const secondaryButton = {
  border:"1px solid white",
  color:"white",
  padding:"14px 23px",
  borderRadius:"7px",
  textDecoration:"none"
};
