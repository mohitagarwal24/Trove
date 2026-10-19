"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Cable,
  ChevronDown,
  Compass,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
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
import { Logo, Modal, Loading, Notice } from "./ui";
import { Discover } from "./discover";
import { Workspace } from "./workspace";
import { Purchases, PurchaseDetail } from "./purchases";
import { SellerStudio } from "./seller-studio";
import { Connect } from "./connect";
type AppState = {
  offers: Offer[];
  user: UserView | null;
  capabilities: Capabilities;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  ensureAuth: () => Promise<boolean>;
  switchAccount: (account: string) => Promise<void>;
};
const AppContext = createContext<AppState | null>(null);
export const useTrove = () => useContext(AppContext)!;
const nav = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/workspace", label: "Research workspace", icon: LayoutDashboard },
  { href: "/purchases", label: "Purchases & receipts", icon: ReceiptText },
];
const tools = [
  { href: "/seller", label: "Seller studio", icon: Store },
  { href: "/connect", label: "Connect your agent", icon: Cable },
];
const defaults: Capabilities = {
  paypal: false,
  paypalClientId: null,
  payouts: false,
  ai: false,
  elastic: false,
  demo: false,
  simulation: false,
};
export function TroveApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [user, setUser] = useState<UserView | null>(null);
  const [caps, setCaps] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [mobile, setMobile] = useState(false);
  const [auth, setAuth] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
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
  async function switchAccount(account: string) {
    await post("/auth/demo", { account });
    await refresh();
    setAuth(false);
    setAccountMenu(false);
    notify(
      account === "buyer"
        ? "You’re in the buyer demo workspace."
        : "You’re signed in to a separate seller workspace.",
    );
  }
  async function ensureAuth() {
    if (user) return true;
    if (caps.demo) {
      await switchAccount("buyer");
      return true;
    }
    setAuth(true);
    return false;
  }
  const selectedNav = [...nav, ...tools].find(
    (n) =>
      n.href === pathname || (n.href !== "/" && pathname.startsWith(n.href)),
  );
  const title =
    selectedNav?.label ||
    (pathname.startsWith("/purchases/") ? "Purchase detail" : "Discover");
  const context: AppState = {
    offers,
    user,
    capabilities: caps,
    refresh,
    notify,
    ensureAuth,
    switchAccount,
  };
  let page: ReactNode = <Discover />;
  if (pathname === "/workspace") page = <Workspace />;
  else if (pathname === "/purchases") page = <Purchases />;
  else if (pathname.startsWith("/purchases/"))
    page = <PurchaseDetail id={pathname.split("/")[2]} />;
  else if (pathname === "/seller") page = <SellerStudio />;
  else if (pathname === "/connect") page = <Connect />;
  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        {mobile && (
          <button
            className="mobile-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
          <Link href="/" className="brand-link" aria-label="Trove home">
            <Logo />
          </Link>
          <button className="workspace-switch" onClick={() => setAuth(true)}>
            <span className="workspace-icon">
              <span>T</span>
            </span>
            <span>
              <strong>
                {user?.role === "seller"
                  ? "Seller workspace"
                  : "Personal workspace"}
              </strong>
              <small>{user ? "Sandbox account" : "Explore Trove"}</small>
            </span>
            <ChevronDown size={14} />
          </button>
          <div className="nav-label">WORKSPACE</div>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
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
            <a
              className="sidebar-help"
              href="https://github.com/paypaldev/getting-started-with-paypal-sandbox"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={16} />
              Sandbox setup guide
              <ArrowUpRight size={13} />
            </a>
            <div className="profile-container">
              <button
                className="profile"
                onClick={() => setAccountMenu((v) => !v)}
                aria-expanded={accountMenu}
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
                  {caps.demo && (
                    <>
                      <button
                        onClick={() =>
                          switchAccount("buyer").catch((e) =>
                            notify(e.message, true),
                          )
                        }
                      >
                        Buyer demo account
                      </button>
                      <button
                        onClick={() =>
                          switchAccount("pricing").catch((e) =>
                            notify(e.message, true),
                          )
                        }
                      >
                        Northstar seller demo
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setAuth(true);
                      setAccountMenu(false);
                    }}
                  >
                    <Settings2 size={14} />
                    Sign in / switch account
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
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
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
              <span className="environment">
                <span />
                Sandbox environment
              </span>
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
                onClick={() => setAuth(true)}
                aria-label="Account settings"
              >
                {user?.name[0] || "T"}
              </button>
            </div>
          </header>
          <main className="main-content">
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
              Thoughtful access to better information.
            </span>
            <span>
              <ShieldCheck size={14} />
              Human-approved purchases<span className="footer-dot">·</span>USD
              sandbox
            </span>
          </footer>
        </div>
        <Modal
          open={auth}
          onOpenChange={setAuth}
          title="Your Trove workspace"
          description="Sign in to manage research, purchases, and agent access."
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSigningIn(true);
              try {
                await post("/auth/login", { email, password });
                await refresh();
                setAuth(false);
                notify("Welcome to your workspace.");
              } catch (e) {
                notify((e as Error).message, true);
              } finally {
                setSigningIn(false);
              }
            }}
            className="form-stack"
          >
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
              />
            </label>
            <button className="button button-primary" disabled={signingIn}>
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {caps.demo && (
            <div className="demo-accounts">
              <span className="section-eyebrow">
                OR EXPLORE WITH FIXTURE ACCOUNTS
              </span>
              <button
                className="button button-secondary"
                onClick={() =>
                  switchAccount("buyer").catch((e) => notify(e.message, true))
                }
              >
                <LayoutDashboard size={16} />
                Open buyer demo
                <ArrowUpRight size={15} />
              </button>
              <button
                className="button button-secondary"
                onClick={() =>
                  switchAccount("pricing").catch((e) => notify(e.message, true))
                }
              >
                <Store size={16} />
                Open seller demo
                <ArrowUpRight size={15} />
              </button>
              <p>
                Shared demo accounts contain synthetic data. No real-money
                payments.
              </p>
            </div>
          )}
        </Modal>
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
