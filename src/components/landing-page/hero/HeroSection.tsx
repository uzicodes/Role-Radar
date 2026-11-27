import WalkingCrowd from "./WalkingCrowd";

export default function HeroSection() {
  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[#122315]">
      <section
        aria-labelledby="hero-heading"
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 pt-[18vh] text-center"
      >
        <h1
          className="font-monarch text-6xl font-bold leading-[0.95] tracking-[0.02em] sm:text-8xl lg:text-[108px]"
          id="hero-heading"
        >
          <span className="block text-[#F3EDE4]">Find the right role</span>
          <span className="mt-2 block text-[#55DD4A]">
            before the crowd
          </span>
        </h1>
      </section>
      <WalkingCrowd />
    </main>
  );
}
