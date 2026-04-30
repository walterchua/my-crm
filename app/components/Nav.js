"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useClient } from "../context/ClientContext";

// The page links shown on the left side of the nav bar
const NAV_LINKS = [
  { href: "/", label: "my-crm" },
  { href: "/admin", label: "Admin" },
  { href: "/members", label: "Members" },
];

export default function Nav() {
  // pathname tells us which page is currently active
  const pathname = usePathname();

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

        {/* ── Right side: client selector ── */}
        {/* ml-auto pushes this group to the far right of the nav bar */}
        {clients.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
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
      </div>
    </nav>
  );
}
