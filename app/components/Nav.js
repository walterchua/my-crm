"use client";

// usePathname reads the current URL path from Next.js's router.
// It updates automatically when the user navigates between pages.
// This hook only works on the client (browser), which is why this
// file must have "use client" at the top.
import { usePathname } from "next/navigation";
import Link from "next/link";

// The links we want to show in the nav.
// href is the URL, label is the visible text.
const NAV_LINKS = [
  { href: "/", label: "my-crm" },
  { href: "/members", label: "Members" },
  { href: "/members/new", label: "Add Member" },
];

export default function Nav() {
  // pathname is the current page path, e.g. "/members" or "/".
  // We use it below to decide which link should look "active".
  const pathname = usePathname();

  return (
    // Outer bar: full width, dark background, subtle bottom border
    <nav className="w-full bg-gray-900 border-b border-gray-700">
      {/* Inner wrapper: centres content and adds horizontal padding */}
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">
        {NAV_LINKS.map(({ href, label }) => {
          // A link is "active" when its href matches the current page path.
          // The "/" home link only matches exactly to avoid highlighting it
          // on every page.
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={[
                // Shared styles for every link
                "text-sm font-medium transition-colors duration-150",
                // Active link: bright white so it stands out
                // Inactive link: muted grey that brightens on hover
                isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-100",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
