"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Search,
  User,
  BookOpen,
  Folder,
  GraduationCap,
  CreditCard,
  Settings,
  Menu,
  ChevronLeft,
  Brain,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Documents", href: "/documents", icon: Folder },
  { label: "Subjects", href: "/subjects", icon: BookOpen },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "Flashcards", href: "/flashcards", icon: GraduationCap },
  { label: "Quiz", href: "/quiz", icon: Brain },
  { label: "Gap Analysis", href: "/gaps", icon: AlertTriangle },
  { label: "Socratic", href: "/review/socratic", icon: Lightbulb },
  { label: "Pricing", href: "/pricing", icon: CreditCard },
  { label: "Account", href: "/account", icon: Settings },
  { label: "Search", href: "/search", icon: Search },
  { label: "Profile", href: "/profile", icon: User },
];

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
        active
          ? "bg-rose-500/15 text-rose-300"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink-paper text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-white/5 md:bg-slate-950/50">
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20">
            <ChevronLeft className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">
            PrepAgent
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
            />
          ))}
        </nav>
        <div className="border-t border-white/5 px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500">
            <User className="h-5 w-5" />
            <span>Free Plan</span>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-slate-950/80 px-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="flex h-16 items-center gap-3 border-b border-white/5 px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20">
                    <ChevronLeft className="h-4 w-4 text-rose-400" />
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-white">
                    PrepAgent
                  </span>
                </div>
                <nav className="space-y-1 px-3 py-6">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      active={pathname === item.href}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold text-white">PrepAgent</span>
          </div>
        </div>

        {/* Page content */}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-rose-200/80 sm:text-sm">
              PrepAgent Dojo
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400 sm:text-base">
              {description}
            </p>
          </header>

          <div className="pb-20 md:pb-8">{children}</div>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 bg-slate-950/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-around px-2 py-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 transition ${
                    active
                      ? "text-rose-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
