import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { syncCurrentUser } from "@/lib/currentUser";

export default async function HeroAccountControl() {
  const user = await syncCurrentUser();

  if (user) {
    return (
      <div className="ml-1 flex">
        <UserButton />
      </div>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="inline-flex rounded-[10px] px-2 py-2 text-xs font-medium text-[#99A1AF] transition-colors hover:text-white sm:text-sm"
    >
      Sign in
    </Link>
  );
}
