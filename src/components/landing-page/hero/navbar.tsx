import Image from "next/image";
import Link from "next/link";

const navigationLinks = [
  { href: "#how-it-works", label: "HOW IT WORK'S" },
  { href: "#faqs", label: "FAQs" },
  { href: "#contacts", label: "CONTACTS" },
  { href: "#bugs", label: "BUG REPORT" },
];

const navigationTextStyle = {
  fontFamily: "Graphik, sans-serif",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "20px",
  letterSpacing: "0.25px",
  color: "#e3ded9",
};

export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 bg-[#122315]">
      <nav
        aria-label="Main navigation"
        className="relative mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between px-6"
      >
        <Link
          aria-label="RoleRadar home"
          className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-[#F3EDE4]"
          href="/"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
            height={32}
            src="/logo.webp"
            width={32}
          />
          <span>RoleRadar</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {navigationLinks.map(({ href, label }) => (
            <Link
              className="transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DD4A]"
              href={href}
              key={label}
              style={navigationTextStyle}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-[#566053] px-4 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DD4A]"
            href="/sign-in"
            style={navigationTextStyle}
          >
            LOGIN
          </Link>
        </div>
      </nav>
    </header>
  );
}