import WalkingCrowd from "./WalkingCrowd";
import Navbar from "./navbar";

export default function HeroSection() {
  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[#122315]">
      <Navbar />
      <section
        aria-labelledby="hero-heading"
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 pt-[18vh] text-center"
      >
        <h1
          className="font-monarch text-6xl font-bold leading-[0.95] tracking-[0.02em] sm:text-8xl lg:text-[108px]"
          id="hero-heading"
        >
          <span className="block text-[#F3EDE4]">Find the right role</span>
          <span className="mt-1 block text-[#55DD4A]">
            before the crowd
          </span>
        </h1>
        <p
          className="mt-6 max-w-4xl text-center"
          style={{
            color: "#e3ded9",
            fontFamily: "Graphik, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            letterSpacing: "0.25px",
            lineHeight: "20px",
          }}
        >
          Automated Job Scraping and Smart Filtering that works while you Sleep. Notifies you while you get up.
        
        </p>
      </section>
      <WalkingCrowd />
    </main>
  );
}
