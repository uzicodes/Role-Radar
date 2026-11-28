import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerkAuthAppearance";

export default function SignInPage() {
  return (
    <main className="clerk-auth-page flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <SignIn
          signUpUrl="/sign-up"
          appearance={clerkAuthAppearance}
        />
      </Suspense>
    </main>
  );
}
