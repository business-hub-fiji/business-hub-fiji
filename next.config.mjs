const nextConfig = {
  async redirects() {
    return [
      { source: "/join", destination: "/register.html", permanent: false },
      { source: "/register", destination: "/register.html", permanent: false },
      { source: "/mall", destination: "/market.html", permanent: false },
      { source: "/market", destination: "/market.html", permanent: false },
    ];
  },
};

export default nextConfig;
