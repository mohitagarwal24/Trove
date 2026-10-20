"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Cable,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Store,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Capabilities, Offer, UserView } from "@/lib/types";
import { api, post } from "@/lib/client";
import { usePageMotion } from "@/lib/use-page-motion";
import { Logo, Loading, Notice } from "./ui";
import { Discover } from "./discover";
import { Workspace } from "./workspace";
import { Purchases, PurchaseDetail } from "./purchases";
import { SellerStudio } from "./seller-studio";
import { Account } from "./account";
import { Legal } from "./legal";
import { AuthDialog, PasswordRecovery } from "./auth";
import { Connect } from "./connect";
import { AppContext, type AppState } from "./trove-context";
import { Dashboard } from "./dashboard";
const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/workspace", label: "Research workspace", icon: LayoutDashboard },
  { href: "/purchases", label: "Purchases & receipts", icon: ReceiptText },
];
const tools = [
  { href: "/seller", label: "Seller studio", icon: Store },
  { href: "/connect", label: "Connect your agent", icon: Cable },
];
const defaults: Capabilities = {
  googleAuth: false,
  paypal: false,
  paypalClientId: null,
  payouts: false,
  ai: false,
  paymentEnvironment: "sandbox",
};
export function TroveApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [user, setUser] = useState<UserView | null>(null);
  const [caps, setCaps] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  usePageMotion(pathname, !loading && !failure);
  const [mobile, setMobile] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [auth, setAuth] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const authResolver = useRef<((ok: boolean) => void) | null>(null);
  const refresh = async () => {
    const data = await api<{
      offers: Offer[];
      user: UserView | null;
      capabilities: Capabilities;
    }>("/bootstrap");
    setOffers(data.offers);
    setUser(data.user);
    setCaps(data.capabilities);
  };
  const notify = (message: string, error = false) =>
    setToast({ message, error });
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("trove-sidebar-collapsed") === "true");
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
    const errors: Record<string, string> = {
      google_start: "Google sign-in is unavailable. Please try again.",
      google_callback:
        "Google sign-in could not be completed. Please try again.",
      google_link:
        "This email already has an account. Sign in first, then connect Google in Account.",
    };
    const url = new URL(location.href);
    const message = errors[url.searchParams.get("auth_error") || ""];
    if (message) {
      setToast({ message, error: true });
      url.searchParams.delete("auth_error");
      history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("trove-sidebar-collapsed", String(next));
    } catch {
      // Persistence is optional; the current preference still applies.
    }
  }
  useEffect(() => {
    refresh()
      .catch((e) => setFailure(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    setMobile(false);
    setAccountMenu(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    const query = matchMedia("(max-width: 760px)");
    const sync = () => {
      setSmallScreen(query.matches);
      if (!query.matches) setMobile(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous =
      menuRef.current || (document.activeElement as HTMLElement | null);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".mobile-nav-close")
      ?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled)",
        ) || [],
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    if (!accountMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setAccountMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenu(false);
        profileRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [accountMenu]);
  async function ensureAuth() {
    if (user) return true;
    setMobile(false);
    setAuth(true);
    return new Promise<boolean>((resolve) => {
      authResolver.current?.(false);
      authResolver.current = resolve;
    });
  }
  function changeAuth(open: boolean) {
    setAuth(open);
    if (!open) {
      authResolver.current?.(false);
      authResolver.current = null;
    }
  }
  const selectedNav = [...nav, ...tools].find(
    (n) =>
      n.href === pathname || (n.href !== "/" && pathname.startsWith(n.href)),
  );
  const title =
    selectedNav?.label ||
    {
      "/account": "Account",
      "/privacy": "Privacy",
      "/terms": "Terms",
      "/reset-password": "Password recovery",
    }[pathname] ||
    (pathname.startsWith("/purchases/") ? "Purchase detail" : "Discover");
  const context: AppState = {
    offers,
    user,
    capabilities: caps,
    refresh,
    notify,
    ensureAuth,
  };
  let page: ReactNode = <Discover />;
  if (pathname === "/dashboard") page = <Dashboard />;
  else if (pathname === "/workspace") page = <Workspace />;
  else if (pathname === "/purchases") page = <Purchases />;
  else if (pathname.startsWith("/purchases/"))
    page = <PurchaseDetail id={pathname.split("/")[2]} />;
  else if (pathname === "/seller") page = <SellerStudio />;
  else if (pathname === "/connect") page = <Connect />;
  else if (pathname === "/reset-password") page = <PasswordRecovery />;
  else if (pathname === "/account") page = <Account />;
  else if (pathname === "/privacy" || pathname === "/terms")
    page = <Legal page={pathname.slice(1) as "privacy" | "terms"} />;
  return (
    <AppContext.Provider value={context}>
      <div
        className={`app-shell${collapsed && !smallScreen ? " sidebar-collapsed" : ""}`}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {mobile && (
          <button
            className="mobile-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          id="workspace-navigation"
          aria-label="Workspace navigation"
          role={smallScreen && mobile ? "dialog" : undefined}
          aria-modal={smallScreen && mobile ? true : undefined}
          inert={smallScreen && !mobile}
          className={`sidebar ${mobile ? "sidebar-open" : ""}`}
        >
          <button
            className="icon-button mobile-nav-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
          <Link href="/" className="brand-link" aria-label="Trove home">
            <Logo />
          </Link>
          <div className="sidebar-scroll">
            <div className="workspace-switch">
              <span className="workspace-icon">
                <span>T</span>
              </span>
              <span>
                <strong>
                  {user?.role === "seller"
                    ? "Seller workspace"
                    : "Personal workspace"}
                </strong>
                <small>{user?.email || "Sign in or create an account"}</small>
              </span>
            </div>
            <div className="nav-label">WORKSPACE</div>
            <nav aria-label="Main navigation">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-label={collapsed && !smallScreen ? n.label : undefined}
                  title={collapsed && !smallScreen ? n.label : undefined}
                  aria-current={
                    pathname === n.href ||
                    (n.href !== "/" && pathname.startsWith(n.href))
                      ? "page"
                      : undefined
                  }
                  className={`nav-link ${pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)) ? "active" : ""}`}
                >
                  <n.icon size={18} />
                  <span>{n.label}</span>
                  {n.href === "/" && (
                    <span className="nav-count">{offers.length}</span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="nav-label nav-label-second">BUILD WITH TROVE</div>
            <nav aria-label="Developer and seller navigation">
              {tools.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-label={collapsed && !smallScreen ? n.label : undefined}
                  title={collapsed && !smallScreen ? n.label : undefined}
                  aria-current={
                    pathname === n.href ||
                    (n.href !== "/" && pathname.startsWith(n.href))
                      ? "page"
                      : undefined
                  }
                  className={`nav-link ${pathname === n.href ? "active" : ""}`}
                >
                  <n.icon size={18} />
                  <span>{n.label}</span>
                  {n.href === "/connect" && <ArrowUpRight size={13} />}
                </Link>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="agent-callout">
                <div className="callout-icon">
                  <Cable size={20} />
                </div>
                <strong>Your agent. Better informed.</strong>
                <p>
                  Bring Trove’s data marketplace to the tools you already use.
                </p>
                <Link href="/connect">
                  Connect an agent <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div className="profile-container" ref={profileRef}>
            <button
              className="profile"
              onClick={() => setAccountMenu((v) => !v)}
              aria-expanded={accountMenu}
              aria-label={
                collapsed && !smallScreen
                  ? user
                    ? `${user.name}: account menu`
                    : "Guest account menu"
                  : undefined
              }
              title={collapsed && !smallScreen ? "Account menu" : undefined}
            >
              <span className="avatar">
                {user?.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("") || "G"}
              </span>
              <span>
                <strong>{user?.name || "Guest workspace"}</strong>
                <small>
                  {user?.role === "seller"
                    ? "Seller account"
                    : "Research & discovery"}
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
            {accountMenu && (
              <div className="account-menu">
                <button
                  onClick={() => {
                    if (user) router.push("/account");
                    else {
                      setMobile(false);
                      setAuth(true);
                    }
                    setAccountMenu(false);
                  }}
                >
                  <Settings2 size={14} />
                  {user ? "Account" : "Sign in"}
                </button>
                {user && (
                  <button
                    onClick={async () => {
                      await post("/auth/logout");
                      await refresh();
                      setAccountMenu(false);
                      router.push("/");
                    }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
        <div className="main-shell" inert={smallScreen && mobile}>
          <header className="topbar">
            <div className="scroll-progress" aria-hidden="true" />
            <div className="breadcrumb">
              <button
                className="icon-button sidebar-toggle"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="workspace-navigation"
              >
                {collapsed ? (
                  <PanelLeftOpen size={20} />
                ) : (
                  <PanelLeftClose size={20} />
                )}
              </button>
              <button
                ref={menuRef}
                aria-expanded={mobile}
                aria-controls="workspace-navigation"
                className="icon-button mobile-menu-button"
                onClick={() => setMobile(true)}
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
              <span>Workspace</span>
              <span className="breadcrumb-slash">/</span>
              <strong>{title}</strong>
            </div>
            <div className="topbar-actions">
              {caps.paymentEnvironment === "sandbox" && (
                <span className="environment">
                  <span />
                  Sandbox
                </span>
              )}
              <span className="topbar-divider" />
              <Link
                href="/connect"
                className="icon-button"
                aria-label="View integration status"
              >
                <Settings2 size={18} />
              </Link>
              <button
                className="top-avatar"
                onClick={() => {
                  if (user) router.push("/account");
                  else setAuth(true);
                }}
                aria-label="Account settings"
              >
                {user?.name[0] || "T"}
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="main-content">
            {loading ? (
              <Loading />
            ) : failure ? (
              <div className="error-page">
                <Notice kind="error">{failure}</Notice>
                <button
                  className="button button-primary"
                  onClick={() => location.reload()}
                >
                  Retry connection
                </button>
              </div>
            ) : (
              page
            )}
          </main>
          <footer className="app-footer">
            <span>
              <Logo small />
            </span>
            <span>
              <ShieldCheck size={14} />
              <Link href="/privacy">Privacy</Link>
              <span className="footer-dot">·</span>
              <Link href="/terms">Terms</Link>
              <span className="footer-dot">·</span>USD
            </span>
          </footer>
        </div>
        <AuthDialog
          open={auth}
          onOpenChange={changeAuth}
          onAuthenticated={async () => {
            await refresh();
            setAuth(false);
            authResolver.current?.(true);
            authResolver.current = null;
            notify("Signed in.");
          }}
        />
        {toast && (
          <div
            className={`toast ${toast.error ? "toast-error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
