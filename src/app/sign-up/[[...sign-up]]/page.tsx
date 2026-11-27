import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <Suspense fallback={null}>
        <SignUp
          signInUrl="/sign-in"
          appearance={{
            variables: {
              colorBackground: "#0f172a",
              colorForeground: "#f8fafc",
              colorInput: "#1e293b",
              colorInputForeground: "#f8fafc",
              colorPrimary: "#6366f1",
            },
          }}
        />
      </Suspense>
    </main>
  );
}
