"use client";
import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/lib/store/authStore";
import { navItems } from "@/components/layout/Sidebar";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { RecentPageTracker } from "@/components/shared/CommandPalette";
import { RootPortalHistoryBridge } from "@/components/shared/RootPortalHistoryBridge";
import api from "@/lib/axios";
import type { AuthUser } from "@/types";

// The permission a page needs. Most pages share their URL's name with their
// module, but not all (/my-tracker → "tracker", /calls → "leads"), so take it
// from the menu. null = open to everyone signed in (Mentors). Settings stays
// behind its own module as before, even though the menu always lists it.
function pageModule(path: string): string | null {
  const segment = path.split("/")[1];
  if (segment === "settings") return "settings";
  const item = navItems.find((n) => n.href === `/${segment}`);
  return item ? item.permModule : segment;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPermission, updateUser } = useAuthStore();
  const router = useRouter();
  useReminderNotifications();

  // Permissions are saved at login; refresh them on every app open so role
  // changes reach people without a logout. On failure keep what we have.
  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get<{ data: AuthUser }>("/auth/profile")
      .then(({ data }) => { if (data?.data?.role) updateUser(data.data); })
      .catch(() => null);
  }, [isAuthenticated, updateUser]);

  useEffect(() => {
    if (typeof window !== "undefined" && !isAuthenticated) {
      // alert("You are not authorized to access this page");
      router.replace("/login");

    }
  }, [isAuthenticated, router]);



  if (!isAuthenticated && typeof window !== "undefined") return null;

  const pathname = usePathname();

  const redirectPermisionPage = useCallback(() => {
    if (typeof window == "undefined") return;
    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      const mod = pageModule(item.href);
      if (mod === null || hasPermission(mod, "view")) {
        router.push(item.href);
        break;
      }
    }
  }, [hasPermission]);
  useEffect(() => {
    if (pathname == "/login" || pathname == "/profile") return;
    const mod = pageModule(pathname);
    if (mod !== null && !hasPermission(mod, "view")) {
      redirectPermisionPage();
    }
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-200 dark:bg-background pwa-safe-top">
      <RootPortalHistoryBridge />
      <RecentPageTracker />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
