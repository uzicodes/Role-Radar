import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerkAuthAppearance";

export default function SignUpPage() {
  return (
    <main className="clerk-auth-page flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <SignUp
          signInUrl="/sign-in"
          appearance={clerkAuthAppearance}
        />
      </Suspense>
    </main>
  );
}
