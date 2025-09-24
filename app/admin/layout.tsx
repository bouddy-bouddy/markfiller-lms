"use client";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  function signOut() {
    // Clear the admin token from localStorage
    localStorage.removeItem("admin_token");
    // Redirect to home page
    window.location.href = "/";
  }

  const pathname = usePathname();

  const nav = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="opacity-80"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      label: "Licenses",
      href: "/admin",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="opacity-80"
        >
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
          <path d="M7 10l5-6 5 6" />
        </svg>
      ),
    },
    {
      label: "Teachers",
      href: "/admin/teachers",
      icon: <GraduationCap className="opacity-80" size={18} />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="opacity-80"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="opacity-80"
        >
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 3 3 5-6" />
        </svg>
      ),
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="opacity-80"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 14 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 8c.36 0 .7.07 1 .2H22a2 2 0 1 1 0 4h-.09c-.39 0-.75.14-1.04.39-.3.25-.51.59-.61.96z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-dvh flex bg-background">
      <aside className="hidden md:flex w-72 border-r min-h-dvh sticky top-0">
        <div className="flex flex-col justify-between w-full p-4">
          <div>
            <div className="px-2 py-3 text-lg font-semibold">
              MarkFiller LMS
            </div>
            <nav className="mt-2 space-y-1">
              {nav.map((n) => {
                const isActive = pathname === n.href;
                return (
                  <a
                    key={`${n.href}-${n.label}`}
                    href={n.href}
                    className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/70 text-foreground/80"
                    }`}
                  >
                    {n.icon}
                    <span>{n.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Admin</div>
            <div className="opacity-70 text-xs break-all">Signed in</div>
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1">
        <header className="md:hidden border-b">
          <div className="flex items-center justify-between p-4">
            <div className="font-semibold">MarkFiller Admin</div>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>
        <main className="p-6 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
