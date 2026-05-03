"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Library, LayoutTemplate, LogOut, Settings, ArrowUp } from "lucide-react";
import { ExportQueuePanel } from "@/components/ExportQueuePanel";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: "/decks", label: "Decks", Icon: Library },
  { href: "/templates", label: "Templates", Icon: LayoutTemplate },
];

function NavLink({
  href,
  label,
  Icon,
  pathname,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  pathname: string;
}) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
      )}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

function AvatarMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      router.push("/login");
    }
  };

  const initials = (email[0] ?? "?").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-label="User menu"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-3 py-2.5 border-b">
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings size={14} />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all duration-200",
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp size={18} />
    </button>
  );
}

export function AppShell() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <>
    <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="bg-indigo-600 rounded-md p-1.5 flex items-center justify-center">
            <CheckCircle2 color="white" size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-indigo-900 hidden sm:block">
            Lexis Automator
          </span>
        </Link>

        {user && (
          <nav className="flex items-center gap-0.5 ml-2">
            {NAV_LINKS.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href} label={label} Icon={Icon} pathname={pathname} />
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {isLoading ? (
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
        ) : user ? (
          <AvatarMenu email={user.email ?? ""} />
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
    <BackToTop />
    <ExportQueuePanel />
    </>
  );
}
