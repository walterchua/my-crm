"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useClient } from "../context/ClientContext";
// useSession reads the current logged-in user from the NextAuth JWT cookie.
// signOut ends the session and redirects to /login.
import { useSession, signOut } from "next-auth/react";

// The page links shown on the left side of the nav bar
const NAV_LINKS = [
  { href: "/", label: "my-crm" },
  { href: "/admin", label: "Admin" },
  { href: "/members", label: "Members" },
];

export default function Nav() {
  // pathname tells us which page is currently active
  const pathname = usePathname();

  // session.data holds { user: { id, name, email, role } } once authenticated.
  // status is "loading" | "authenticated" | "unauthenticated".
  const { data: session } = useSession();

  // Pull the shared client list and selected client out of context.
  // This is the same data that Dashboard, MembersList, etc. read —
  // all components stay in sync because they share one source of truth.
  const { clients, selectedClient, setSelectedClient } = useClient();

  // When the user picks a different client from the dropdown,
  // find the full client object (we need both id and name) and
  // store it in context so every other page updates automatically.
  function handleClientChange(e) {
    const chosen = clients.find((c) => c.id === e.target.value);
    if (chosen) setSelectedClient({ id: chosen.id, name: chosen.name });
  }

  return (
    // Outer bar: full width, dark background, subtle bottom border
    <nav className="w-full bg-gray-900 border-b border-gray-700">
      {/* Inner wrapper: centres content, left links + right selector */}
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">

        {/* ── Left side: page navigation links ── */}
        {NAV_LINKS.map(({ href, label }) => {
          // Exact match for "/" and "/members/new".
          // "/members" also activates on detail pages like "/members/123",
          // but must NOT activate on "/members/new" (that belongs to Add Member).
          // "/admin" activates on /admin and all /admin/... sub-pages.
          const isActive =
            href === "/members"
              ? pathname === "/members" ||
                (pathname.startsWith("/members/") &&
                  pathname !== "/members/new")
              : href === "/admin"
              ? pathname === "/admin" || pathname.startsWith("/admin/")
              : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={[
                "text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-100",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}

        {/* ── Right side: client selector + user profile ── */}
        {/* ml-auto pushes this entire group to the far right of the nav bar */}
        <div className="ml-auto flex items-center gap-4">

          {/* Client selector — only shown when clients have loaded */}
          {clients.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Client:
              </span>
              <select
                value={selectedClient?.id ?? ""}
                onChange={handleClientChange}
                className="bg-gray-800 text-white text-xs border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── User profile + sign out ── */}
          {/* Only rendered once the session is available — avoids a flash
              of the sign-out button before authentication is confirmed */}
          {session?.user && (
            <div className="flex items-center gap-2">

              {/* Circular avatar showing the first letter of the user's name.
                  Indigo background matches the primary action colour used
                  elsewhere (buttons, focus rings) in the project. */}
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {session.user.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>

              {/* Display the full name next to the avatar */}
              <span className="text-gray-300 text-xs whitespace-nowrap">
                {session.user.name}
              </span>

              {/* Sign-out button — calls NextAuth signOut() which clears the
                  JWT cookie and redirects the browser to /login */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs text-gray-400 hover:text-white transition-colors duration-150 whitespace-nowrap"
              >
                Sign out
              </button>

            </div>
          )}

        </div>
      </div>
    </nav>
  );
}
