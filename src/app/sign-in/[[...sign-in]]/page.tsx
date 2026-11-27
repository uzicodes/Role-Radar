import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <Suspense fallback={null}>
        <SignIn
          signUpUrl="/sign-up"
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
