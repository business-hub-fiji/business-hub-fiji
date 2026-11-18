const nextConfig = {
  async rewrites() {
    // The main address opens the mall, so one link does everything.
    return [
      { source: "/", destination: "/market.html" },
      { source: "/shop/:slug", destination: "/shop.html" },
      { source: "/dashboard", destination: "/dashboard.html" },
    ];
  },
  async redirects() {
    return [
      { source: "/join", destination: "/register.html", permanent: false },
      { source: "/register", destination: "/register.html", permanent: false },
      { source: "/plans", destination: "/plans.html", permanent: false },
      { source: "/mall", destination: "/", permanent: false },
      { source: "/myshop", destination: "/dashboard", permanent: false },
      { source: "/market", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
