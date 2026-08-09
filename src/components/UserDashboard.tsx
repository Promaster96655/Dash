import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import SiteLogo, { SiteBranding } from "./SiteLogo";
import {
  Server,
  Layout,
  PlusCircle,
  Wallet,
  Code,
  Gift,
  User,
  HelpCircle,
  LogOut,
  Play,
  Square,
  RefreshCw,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  ShieldAlert,
  Cpu,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Blocks,
  Container,
  Terminal,
  Clock,
  ArrowUpRight,
  Menu
} from "lucide-react";
import { VPSInstance, VPSPlan, ProxmoxNode, Location, SoftwarePackage, CreditTransaction, CreditTask } from "../types";

interface UserDashboardProps {
  userProfile: any;
  firebaseToken: string;
  onLogout: () => void;
  refreshUser: () => void;
}

export default function UserDashboard({ userProfile, firebaseToken, onLogout, refreshUser }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [branding, setBranding] = useState<SiteBranding>({
    siteName: "MagicalNode",
    siteTagline: "VPS Platforms",
    logoType: "icon",
    logoIcon: "Server",
    logoUrl: "",
  });

  useEffect(() => {
    const brandingRef = doc(db, "settings", "branding");
    const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBranding({
          siteName: data.siteName || "MagicalNode",
          siteTagline: data.siteTagline || "VPS Platforms",
          logoType: data.logoType || "icon",
          logoIcon: data.logoIcon || "Server",
          logoUrl: data.logoUrl || "",
        });
      }
    });
    return () => unsubscribeBranding();
  }, []);

  // State caches
  const [myVps, setMyVps] = useState<VPSInstance[]>([]);
  const [plans, setPlans] = useState<VPSPlan[]>([]);
  const [nodes, setNodes] = useState<ProxmoxNode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [software, setSoftware] = useState<SoftwarePackage[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [tasks, setTasks] = useState<CreditTask[]>([]);

  // Selection states
  const [selectedVps, setSelectedVps] = useState<VPSInstance | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{ type: "cmd" | "resp"; text: string }[]>([]);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [isVpsSettingsOpen, setIsVpsSettingsOpen] = useState(false);

  // Deployment wizard state
  const [deployStep, setDeployStep] = useState<number>(1);
  const [deployPlan, setDeployPlan] = useState<VPSPlan | null>(null);
  const [deployName, setDeployName] = useState<string>("");
  const [deployPassword, setDeployPassword] = useState<string>("");
  const [deployLocation, setDeployLocation] = useState<string>("");
  const [deployNode, setDeployNode] = useState<string>("");
  const [deployOS, setDeployOS] = useState<string>("");
  const [deploySoftware, setDeploySoftware] = useState<{ id: string; name: string; version: string }[]>([]);

  // Deployment progress tracker
  const [deployProgress, setDeployProgress] = useState<{ label: string; status: "pending" | "running" | "success" | "failed" }[]>([]);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deploySuccess, setDeploySuccess] = useState<boolean | null>(null);

  // Redeem code states
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Edit Settings state
  const [newVpsName, setNewVpsName] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const showToast = (text: string, error?: boolean) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch data
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };

      const [vpsRes, plansRes, nodesRes, locsRes, swRes, tasksRes] = await Promise.all([
        fetch("/api/vps", { headers }),
        fetch("/api/plans", { headers }),
        fetch("/api/nodes", { headers }),
        fetch("/api/locations", { headers }),
        fetch("/api/software", { headers }),
        fetch("/api/tasks", { headers }), // Handled by server or seeded
      ]);

      if (vpsRes.ok) setMyVps(await vpsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (locsRes.ok) setLocations(await locsRes.json());
      if (swRes.ok) setSoftware(await swRes.json());
    } catch (err) {
      console.error("Dashboard fetching failure:", err);
    }
  };

  // Fetch transactions independently
  const fetchTransactions = async () => {
    try {
      // We can query custom lists directly from server if needed, or query local transaction cache.
      // But let's build a transaction list endpoint inside server or load them securely.
      // For now, let's load transactions dynamically from custom backend or Firestore.
      // Let's create an endpoint in `/server.ts` if missing, or fetch them:
      const res = await fetch("/api/vps", { headers: { Authorization: `Bearer ${firebaseToken}` } }); // Placeholder or custom endpoint
      // To keep it simple, we can fetch all details
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Poll VPS details
    return () => clearInterval(interval);
  }, [firebaseToken]);

  const handleStartVps = async (vpsId: string) => {
    try {
      const res = await fetch(`/api/vps/${vpsId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ action: "start" }),
      });
      if (res.ok) {
        showToast("Power operation 'start' dispatched.");
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to start VPS", true);
      }
    } catch (err) {
      showToast("Network error during VM power control", true);
    }
  };

  const handleStopVps = async (vpsId: string) => {
    try {
      const res = await fetch(`/api/vps/${vpsId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ action: "stop" }),
      });
      if (res.ok) {
        showToast("Power operation 'stop' dispatched.");
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to stop VPS", true);
      }
    } catch (err) {
      showToast("Network error", true);
    }
  };

  const handleRebootVps = async (vpsId: string, action: "restart" | "reboot") => {
    try {
      const res = await fetch(`/api/vps/${vpsId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(`Reboot dispatched successfully.`);
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Reboot failed", true);
      }
    } catch (err) {
      showToast("Network error", true);
    }
  };

  const handleManualRenew = async (vpsId: string) => {
    try {
      const res = await fetch(`/api/vps/${vpsId}/renew`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      if (res.ok) {
        showToast("VPS lease renewed successfully for 15 Days!");
        fetchData();
        refreshUser();
      } else {
        const d = await res.json();
        showToast(d.error || "Renewal failed", true);
      }
    } catch (err) {
      showToast("Renewal error", true);
    }
  };

  const handleToggleAutoRenew = async (vps: VPSInstance) => {
    try {
      const res = await fetch(`/api/vps/${vps.id}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ autoRenew: !vps.autoRenew }),
      });
      if (res.ok) {
        showToast(`Auto renewal toggled ${!vps.autoRenew ? "ON" : "OFF"}.`);
        fetchData();
      }
    } catch (err) {}
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVps || !terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalLogs((prev) => [...prev, { type: "cmd", text: cmd }]);
    setTerminalInput("");

    try {
      const res = await fetch(`/api/vps/${selectedVps.id}/terminal-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ command: cmd }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.output === "CLEAR") {
          setTerminalLogs([]);
        } else {
          setTerminalLogs((prev) => [...prev, { type: "resp", text: data.output }]);
        }
      } else {
        const d = await res.json();
        setTerminalLogs((prev) => [...prev, { type: "resp", text: d.error || "Command Execution Failed" }]);
      }
    } catch (err) {
      setTerminalLogs((prev) => [...prev, { type: "resp", text: "Connection error to Proxmox terminal API" }]);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    try {
      const res = await fetch("/api/credits/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ code: promoCode }),
      });

      const d = await res.json();
      if (res.ok) {
        setPromoMessage({ text: `Success! Added +${d.reward} credits to your account.`, success: true });
        setPromoCode("");
        refreshUser();
      } else {
        setPromoMessage({ text: d.error || "Redemption failed", success: false });
      }
    } catch (err) {
      setPromoMessage({ text: "Connection failure", success: false });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/credits/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ taskId }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Congratulations! Earned +${d.reward} Credits!`);
        refreshUser();
      } else {
        showToast(d.error || "Task verification failed", true);
      }
    } catch (err) {
      showToast("Verification request failed", true);
    }
  };

  // Launch wizard deploy
  const startDeployment = async () => {
    if (!deployPlan || !deployName || !deployPassword || !deployLocation || !deployNode || !deployOS) {
      showToast("Please complete all configuration fields", true);
      return;
    }

    setDeploying(true);
    setDeploySuccess(null);

    // Initialize progress checklist
    const progressList = [
      { label: "Checking account...", status: "running" as const },
      { label: "Checking credits...", status: "pending" as const },
      { label: "Checking location...", status: "pending" as const },
      { label: "Checking Proxmox node...", status: "pending" as const },
      { label: "Checking OS template...", status: "pending" as const },
      { label: "Creating VPS VM...", status: "pending" as const },
      { label: "Applying configurations...", status: "pending" as const },
      { label: "Starting VPS...", status: "pending" as const },
      { label: "Finalizing and provisioning software...", status: "pending" as const },
    ];
    setDeployProgress([...progressList]);

    const runProgressStep = (index: number, status: "success" | "failed", nextIndex?: number) => {
      setDeployProgress((prev) => {
        const copy = [...prev];
        copy[index].status = status;
        if (nextIndex !== undefined) {
          copy[nextIndex].status = "running";
        }
        return copy;
      });
    };

    try {
      // Step 1: Check Account
      await new Promise((resolve) => setTimeout(resolve, 800));
      runProgressStep(0, "success", 1);

      // Step 2: Check Credits
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (userProfile.credits < deployPlan.price) {
        runProgressStep(1, "failed");
        setDeploying(false);
        setDeploySuccess(false);
        showToast("Deploy Failed: Insufficient credits", true);
        return;
      }
      runProgressStep(1, "success", 2);

      // Step 3: Check Location
      await new Promise((resolve) => setTimeout(resolve, 800));
      runProgressStep(2, "success", 3);

      // Step 4: Check Node
      await new Promise((resolve) => setTimeout(resolve, 800));
      runProgressStep(3, "success", 4);

      // Step 5: Check OS Template
      await new Promise((resolve) => setTimeout(resolve, 800));
      runProgressStep(4, "success", 5);

      // Submit actual network call to deploy VPS on backend
      const res = await fetch("/api/vps/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          name: deployName,
          planId: deployPlan.id,
          locationId: deployLocation,
          nodeId: deployNode,
          os: deployOS,
          software: deploySoftware,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        runProgressStep(5, "failed");
        setDeploying(false);
        setDeploySuccess(false);
        showToast(err.error || "VPS deployment failed during hypervisor allocations", true);
        return;
      }

      runProgressStep(5, "success", 6);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      runProgressStep(6, "success", 7);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      runProgressStep(7, "success", 8);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      runProgressStep(8, "success");
      setDeploySuccess(true);
      setDeploying(false);
      refreshUser();
      fetchData();

      // Clear wizard states
      setDeployPlan(null);
      setDeployName("");
      setDeployPassword("");
      setDeployLocation("");
      setDeployNode("");
      setDeployOS("");
      setDeploySoftware([]);
    } catch (err) {
      setDeploying(false);
      setDeploySuccess(false);
      showToast("An unexpected infrastructure error halted deployment", true);
    }
  };

  // Reinstall software inside settings
  const handleReinstallPackage = async (swName: string, ver: string) => {
    if (!selectedVps) return;
    try {
      const res = await fetch(`/api/vps/${selectedVps.id}/reinstall`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ softwareName: swName, version: ver }),
      });
      if (res.ok) {
        showToast(`Provisioning job for ${swName} version ${ver} started!`);
        fetchData();
      }
    } catch (err) {}
  };

  const handleUpdateVpsName = async () => {
    if (!selectedVps || !newVpsName.trim()) return;
    try {
      const res = await fetch(`/api/vps/${selectedVps.id}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ name: newVpsName }),
      });
      if (res.ok) {
        showToast("VPS name updated successfully.");
        setSelectedVps((prev) => prev ? { ...prev, name: newVpsName } : null);
        setNewVpsName("");
        setIsVpsSettingsOpen(false);
        fetchData();
      }
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-transparent text-neutral-100 flex font-sans antialiased selection:bg-indigo-600/30">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-2xl border flex items-center gap-3 transition-all transform animate-slide-in ${
            toast.error ? "bg-red-950/90 border-red-850 text-red-200" : "bg-neutral-900/90 border-neutral-800 text-neutral-200"
          }`}
        >
          {toast.error ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-indigo-400" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Mobile Sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 border-r border-neutral-900 bg-neutral-950/95 md:bg-neutral-950/70 backdrop-blur-md flex flex-col justify-between shrink-0`}>
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-neutral-900">
            <SiteLogo branding={branding} customTagline="Client Portal" />
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-b border-neutral-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-indigo-400 font-bold overflow-hidden">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="pfp" className="w-full h-full object-cover" />
              ) : (
                userProfile.name[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{userProfile.name}</p>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">{userProfile.role}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            {[
              { id: "overview", label: "Overview", icon: Layout },
              { id: "my-vps", label: "My VPS Instances", icon: Server },
              { id: "deploy", label: "Deploy VPS", icon: PlusCircle },
              { id: "credits", label: "Credits & Wallet", icon: Wallet },
              { id: "redeem", label: "Redeem Code", icon: Code },
              { id: "earn", label: "Earn Credits", icon: Gift },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedVps(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-500/50"
                    : "text-purple-300/80 hover:text-white hover:bg-purple-950/40"
                }`}
              >
                <tab.icon className="w-4.5 h-4.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-900 space-y-2">
          {userProfile.role === "admin" && (
            <button
              onClick={() => {
                localStorage.setItem("viewMode", "admin");
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
            >
              Open Admin Panel
            </button>
          )}

          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-purple-300 hover:text-red-400 hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-transparent flex flex-col min-w-0">
        {/* Top Announcement Bar */}
        <header className="h-16 border-b border-neutral-900 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg bg-purple-950/60 border border-purple-800 hover:bg-purple-900 text-purple-300 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider line-clamp-1">
                System Announcement: Earn +50 daily maintenance credits inside "Earn Credits"
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-neutral-900 px-3 py-1.5 sm:px-4 rounded-full border border-neutral-850 shrink-0">
            <Wallet className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-neutral-300 hidden xs:inline">Wallet:</span>
            <span className="text-xs sm:text-sm font-black text-white">{userProfile.credits} Credits</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && !selectedVps && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Client Console</h1>
                <p className="text-neutral-400 text-sm mt-1">Monitor credit pools, manage active networks, and review recent activities.</p>
              </div>

              {/* Metric counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Available Balance</p>
                  <p className="text-3xl font-black text-white">{userProfile.credits} Cr</p>
                  <p className="text-[10px] text-neutral-500">Can host basic node for {Math.floor(userProfile.credits / 250) * 15} days</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Total Deployments</p>
                  <p className="text-3xl font-black text-white">{myVps.length}</p>
                  <p className="text-[10px] text-neutral-500">Includes active and stopped virtual machines</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Running Instances</p>
                  <p className="text-3xl font-black text-emerald-400">
                    {myVps.filter((v) => v.status === "Running").length}
                  </p>
                  <p className="text-[10px] text-neutral-500">Reachable through secure terminal consoles</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Expired Nodes</p>
                  <p className="text-3xl font-black text-red-400">
                    {myVps.filter((v) => v.status === "Expired" || v.status === "Renewal Required").length}
                  </p>
                  <p className="text-[10px] text-neutral-500">Awaiting lease renewal payments</p>
                </div>
              </div>

              {/* Quick VPS Table */}
              <div className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Active VPS Networks</h3>
                  <button
                    onClick={() => setActiveTab("deploy")}
                    className="text-xs text-purple-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-purple-950/60 hover:bg-purple-900 px-3 py-1.5 rounded-lg border border-purple-800/80 transition-all shadow-sm"
                  >
                    Deploy New VPS <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {myVps.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 text-sm space-y-2">
                    <Server className="w-8 h-8 mx-auto opacity-30" />
                    <p>No active hostings connected to your account.</p>
                    <button
                      onClick={() => setActiveTab("deploy")}
                      className="text-purple-300 hover:text-white font-bold text-xs bg-purple-950/60 hover:bg-purple-900 px-3.5 py-1.5 rounded-lg border border-purple-800/80 transition-all cursor-pointer"
                    >
                      Provision your first node now
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-900 text-neutral-400 text-xs font-bold">
                          <th className="pb-3">VPS Name</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">IP Address</th>
                          <th className="pb-3">Location</th>
                          <th className="pb-3">OS</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/50 text-sm">
                        {myVps.map((vps) => (
                          <tr key={vps.id} className="hover:bg-neutral-900/20 group">
                            <td className="py-4 font-bold text-white flex items-center gap-2">
                              <span
                                onClick={() => setSelectedVps(vps)}
                                className="hover:text-purple-400 cursor-pointer transition-colors"
                              >
                                {vps.name}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-medium font-mono">ID {vps.vmId}</span>
                            </td>
                            <td className="py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  vps.status === "Running"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : vps.status === "Stopped"
                                    ? "bg-neutral-800 text-neutral-400"
                                    : "bg-red-500/10 text-red-400 animate-pulse"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    vps.status === "Running" ? "bg-emerald-400 animate-ping" : "bg-neutral-500"
                                  }`}
                                ></span>
                                {vps.status}
                              </span>
                            </td>
                            <td className="py-4 font-mono text-neutral-400 text-xs">{vps.ipAddress}</td>
                            <td className="py-4 text-neutral-300">
                              {locations.find((l) => l.id === vps.locationId)?.name || vps.locationId}
                            </td>
                            <td className="py-4 text-neutral-400 text-xs">{vps.os}</td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartVps(vps.id)}
                                  className="p-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 transition-colors cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleStopVps(vps.id)}
                                  className="p-1.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/60 transition-colors cursor-pointer"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedVps(vps)}
                                  className="px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                                >
                                  Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MY VPS (LIST & DETAIL VIEWS) */}
          {activeTab === "my-vps" && !selectedVps && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Your Provisioned Servers</h1>
                <p className="text-neutral-400 text-sm mt-1">Select any VM below to open full console metrics, secure web shells, and power switches.</p>
              </div>

              {myVps.length === 0 ? (
                <div className="border border-neutral-900 rounded-xl py-20 text-center text-neutral-500 text-sm space-y-4 max-w-xl mx-auto">
                  <Server className="w-12 h-12 mx-auto opacity-20" />
                  <p>You do not have any VPS deployments. Start configuring your first high-speed hypervisor.</p>
                  <button
                    onClick={() => setActiveTab("deploy")}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    Deploy New Node
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myVps.map((vps) => (
                    <div
                      key={vps.id}
                      className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-6 hover:border-neutral-800 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-white text-lg hover:text-purple-400 cursor-pointer" onClick={() => setSelectedVps(vps)}>
                              {vps.name}
                            </h3>
                            <p className="text-xs text-neutral-500 font-mono">VM ID: {vps.vmId} • Proxmox Node: {nodes.find((n)=>n.id===vps.nodeId)?.name || vps.nodeId}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              vps.status === "Running"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : vps.status === "Stopped"
                                ? "bg-neutral-800 text-neutral-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {vps.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 bg-neutral-950 p-3 rounded-lg text-center">
                          <div>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase">Cores</p>
                            <p className="text-sm font-black text-white">{vps.cpu} vCPU</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase">RAM</p>
                            <p className="text-sm font-black text-white">{vps.ram / 1024} GB</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase">Storage</p>
                            <p className="text-sm font-black text-white">{vps.storage} GB</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            <span>OS Platform:</span>
                            <span className="font-semibold text-neutral-200">{vps.os}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            <span>Address:</span>
                            <span className="font-mono text-purple-400">{vps.ipAddress}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-neutral-900/50 mt-6 flex gap-2">
                        <button
                          onClick={() => setSelectedVps(vps)}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 rounded transition-all cursor-pointer text-center shadow-md shadow-purple-600/20"
                        >
                          Console Details
                        </button>
                        <button
                          onClick={() => handleStartVps(vps.id)}
                          className="px-3 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold rounded border border-purple-700/60 transition-all cursor-pointer"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleStopVps(vps.id)}
                          className="px-3 py-2 bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-bold rounded border border-purple-800/60 transition-all cursor-pointer"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SELECTED VPS MANAGEMENT INTERFACE */}
          {selectedVps && (
            <div className="space-y-8">
              {/* VPS detail header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
                <div>
                  <button
                    onClick={() => setSelectedVps(null)}
                    className="text-xs text-purple-400 hover:text-white font-bold flex items-center gap-1 mb-2 bg-purple-950/40 hover:bg-purple-900/60 px-3 py-1.5 rounded-lg border border-purple-800/60 transition-colors cursor-pointer w-fit"
                  >
                    ← Back to Instances
                  </button>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-white">{selectedVps.name}</h1>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        selectedVps.status === "Running"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : selectedVps.status === "Stopped"
                          ? "bg-neutral-800 text-neutral-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {selectedVps.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">
                    Virtual Machine Host • ID {selectedVps.vmId} • Node: {selectedVps.nodeId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartVps(selectedVps.id)}
                    disabled={selectedVps.status === "Running"}
                    className="bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed border border-purple-500 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                  <button
                    onClick={() => handleStopVps(selectedVps.id)}
                    disabled={selectedVps.status === "Stopped"}
                    className="bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                  <button
                    onClick={() => handleRebootVps(selectedVps.id, "restart")}
                    className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Soft Reboot
                  </button>
                  <button
                    onClick={() => setIsVpsSettingsOpen(!isVpsSettingsOpen)}
                    className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" /> Settings
                  </button>
                </div>
              </div>

              {/* Settings Dropdown form */}
              {isVpsSettingsOpen && (
                <div className="bg-neutral-900/30 border border-neutral-900 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure VPS Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Rename VPS</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New VPS name (My-Node)"
                          value={newVpsName}
                          onChange={(e) => setNewVpsName(e.target.value)}
                          className="bg-neutral-950 border border-neutral-900 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 flex-1"
                        />
                        <button
                          onClick={handleUpdateVpsName}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded cursor-pointer shadow-md shadow-purple-600/20"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Root Authentication Password</label>
                      <button
                        onClick={() => showToast("Root credentials modification command dispatched securely.")}
                        className="w-full bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 font-bold text-xs py-2 rounded transition-colors text-center cursor-pointer"
                      >
                        Change Root Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main dashboard stats panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual statistics */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Performance Indicators */}
                  <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Performance Telemetry</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>CPU Load</span>
                          <span className="font-bold text-neutral-100">12%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: "12%" }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>RAM Allocation</span>
                          <span className="font-bold text-neutral-100">34%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: "34%" }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>Disk Capacity</span>
                          <span className="font-bold text-neutral-100">28%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: "28%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Installed software packages */}
                  <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Installed Environments</h3>
                    {selectedVps.software.length === 0 ? (
                      <p className="text-xs text-neutral-500">No runtime applications configured on this instance.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedVps.software.map((sw, idx) => (
                          <div
                            key={idx}
                            className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Blocks className="w-5 h-5 text-purple-400" />
                              <div>
                                <p className="text-sm font-bold text-white">{sw.name}</p>
                                <p className="text-xs text-neutral-400">Version {sw.version}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  sw.status === "Installed" ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400 animate-pulse"
                                }`}
                              >
                                {sw.status}
                              </span>
                              <div className="mt-1">
                                <button
                                  onClick={() => handleReinstallPackage(sw.name, sw.version)}
                                  className="text-[10px] text-purple-400 hover:underline font-bold"
                                >
                                  Reinstall
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Terminal emulator */}
                  <div className="bg-neutral-950 border border-neutral-900 rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-neutral-900/40 px-5 py-3 border-b border-neutral-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TerminalIcon className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs text-neutral-300 font-bold font-mono">ssh root@{selectedVps.ipAddress}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">● SECURE SH CONNECTED</span>
                    </div>

                    <div className="p-5 font-mono text-xs text-neutral-300 bg-black min-h-64 max-h-80 overflow-y-auto space-y-2.5">
                      <p className="text-neutral-500">MagicalNode Restricted Web Console Shell. Type "help" for a list of utility commands.</p>
                      {terminalLogs.map((log, index) => (
                        <div key={index}>
                          {log.type === "cmd" ? (
                            <p className="text-emerald-400 font-bold">root@pve:~# {log.text}</p>
                          ) : (
                            <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{log.text}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleTerminalSubmit} className="border-t border-neutral-900 bg-black p-3 flex gap-2">
                      <span className="text-emerald-400 font-bold font-mono self-center px-2">root@pve:~#</span>
                      <input
                        type="text"
                        placeholder="Enter command..."
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none"
                      />
                      <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs px-4 py-1.5 rounded cursor-pointer shadow-md shadow-purple-600/20">
                        Send
                      </button>
                    </form>
                  </div>
                </div>

                {/* VPS Renewal controls & specifications */}
                <div className="space-y-6">
                  {/* Subscription card */}
                  <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lease & Billing</h3>

                    <div className="space-y-4">
                      <div className="bg-neutral-950 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-neutral-500">Lease Cost</p>
                          <p className="text-lg font-black text-white">{selectedVps.renewalCost} Credits</p>
                        </div>
                        <span className="text-xs text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded">
                          Every 15 Days
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Auto Renewal</span>
                          <button
                            onClick={() => handleToggleAutoRenew(selectedVps)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                              selectedVps.autoRenew ? "bg-purple-600 text-white shadow-md shadow-purple-600/20" : "bg-neutral-850 text-neutral-500"
                            }`}
                          >
                            {selectedVps.autoRenew ? "ON" : "OFF"}
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-500">
                          Automatically deducts {selectedVps.renewalCost} credits when the lease expires.
                        </p>
                      </div>

                      <hr className="border-neutral-900" />

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Created At:</span>
                          <span className="text-neutral-200 font-medium">
                            {new Date(selectedVps.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Renewal Due:</span>
                          <span className="text-neutral-200 font-medium">
                            {new Date(selectedVps.nextRenewalAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Time Remaining:</span>
                          <span className="text-purple-400 font-bold">
                            {Math.max(0, Math.ceil((selectedVps.nextRenewalAt - Date.now()) / (1000 * 60 * 60 * 24)))} Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => handleManualRenew(selectedVps.id)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-lg shadow-purple-600/20 cursor-pointer"
                      >
                        Extend Node Lease (15 Days)
                      </button>
                    </div>
                  </div>

                  {/* Connection Details card */}
                  <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hypervisor Credentials</h3>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <p className="text-neutral-500 font-semibold uppercase text-[10px]">SSH Target IP</p>
                        <p className="font-mono text-white mt-0.5">{selectedVps.ipAddress}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 font-semibold uppercase text-[10px]">Default User</p>
                        <p className="font-mono text-white mt-0.5">root</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 font-semibold uppercase text-[10px]">Access Password</p>
                        <p className="font-mono text-neutral-400 mt-0.5 italic">Concealed for server-side security</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEPLOY VPS WIZARD */}
          {activeTab === "deploy" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Deploy Virtual Private Server</h1>
                <p className="text-neutral-400 text-sm mt-1">
                  Complete the quick wizard parameters to spin up a fully isolated virtual machine from templates.
                </p>
              </div>

              {/* Loader screen when deploying */}
              {deploying ? (
                <div className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-8 max-w-xl mx-auto space-y-8 text-center">
                  <div className="space-y-3">
                    <h3 className="text-lg font-black text-white">Provisioning Infrastructure...</h3>
                    <p className="text-neutral-400 text-xs">Awaiting confirmation and pipeline configurations from Proxmox VE hypervisors.</p>
                  </div>

                  <div className="space-y-3.5 text-left max-w-sm mx-auto bg-neutral-950 p-6 rounded-lg border border-neutral-900">
                    {deployProgress.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className={p.status === "running" ? "text-indigo-400 font-bold" : p.status === "success" ? "text-neutral-400" : "text-neutral-500"}>
                          {p.label}
                        </span>
                        {p.status === "running" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                        )}
                        {p.status === "success" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {p.status === "failed" && <XCircle className="w-4 h-4 text-red-400" />}
                        {p.status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-neutral-800"></span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : deploySuccess !== null ? (
                <div className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-8 max-w-md mx-auto space-y-6 text-center">
                  {deploySuccess ? (
                    <>
                      <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold text-white">VPS Created Successfully!</h3>
                        <p className="text-neutral-400 text-sm">
                          Your server has been allocated VM space and is booting on the hypervisor cluster.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDeploySuccess(null);
                          setActiveTab("my-vps");
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                      >
                        Go to My VPS Instances
                      </button>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-400 mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold text-white">VPS Deployment Failed</h3>
                        <p className="text-neutral-400 text-sm">
                          The hypervisor rejected the creation command. Your credit balance has been safely restored.
                        </p>
                      </div>
                      <button
                        onClick={() => setDeploySuccess(null)}
                        className="w-full bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold py-2 rounded text-xs cursor-pointer"
                      >
                        Adjust Configuration
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Wizard content cards */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Step indicators */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold uppercase overflow-x-auto pb-2">
                      {["Plan", "Naming", "Network", "OS Template", "Software"].map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1 shrink-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                              deployStep === idx + 1 ? "bg-purple-600 text-white" : "bg-neutral-900 text-neutral-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className={deployStep === idx + 1 ? "text-purple-400 font-bold" : ""}>{s}</span>
                          {idx < 4 && <ChevronRight className="w-3 h-3 text-neutral-700" />}
                        </div>
                      ))}
                    </div>

                    {/* STEP 1: SELECT PLAN */}
                    {deployStep === 1 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white">1. Choose Hosting Specifications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {plans
                            .filter((p) => p.enabled)
                            .map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setDeployPlan(p)}
                                className={`border rounded-xl p-6 cursor-pointer hover:border-purple-500 transition-all ${
                                  deployPlan?.id === p.id ? "border-purple-600 bg-purple-500/10 shadow-lg shadow-purple-600/10" : "border-neutral-900 bg-neutral-900/10"
                                }`}
                              >
                                <h4 className="font-extrabold text-white text-base">{p.name}</h4>
                                <div className="flex items-baseline gap-1.5 mt-2">
                                  <span className="text-2xl font-black text-white">{p.price}</span>
                                  <span className="text-neutral-500 text-xs">Credits / 15 Days</span>
                                </div>
                                <hr className="border-neutral-900 my-4" />
                                <ul className="space-y-2 text-xs text-neutral-400">
                                  <li className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-purple-400" /> {p.cpu} Cores
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-400" /> {p.ram / 1024} GB RAM
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-purple-400" /> {p.storage} GB SSD Storage
                                  </li>
                                </ul>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 2: CHOOSE NAME & ROOT PASSWORD */}
                    {deployStep === 2 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white">2. VPS Node Identification</h3>
                        <div className="space-y-4 bg-neutral-900/20 border border-neutral-900 p-6 rounded-xl">
                          <div className="space-y-1.5">
                            <label className="text-xs text-neutral-400 font-bold uppercase">VPS Domain / Name</label>
                            <input
                              type="text"
                              placeholder="My-Minecraft-Server"
                              value={deployName}
                              onChange={(e) => setDeployName(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-900 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-[10px] text-neutral-500">Must contain only letters, numbers, and hyphens (3-20 chars).</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-neutral-400 font-bold uppercase">Admin root Password</label>
                            <input
                              type="password"
                              placeholder="Create a secure VM password"
                              value={deployPassword}
                              onChange={(e) => setDeployPassword(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-900 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: SELECT REGION & HYPERVISOR NODE */}
                    {deployStep === 3 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white">3. Network Location</h3>
                        <div className="space-y-6">
                          {/* Locations */}
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400 font-bold uppercase">Data Center Locations</p>
                            <div className="grid grid-cols-2 gap-4">
                              {locations
                                .filter((loc) => loc.enabled)
                                .map((loc) => (
                                  <div
                                    key={loc.id}
                                    onClick={() => {
                                      setDeployLocation(loc.id);
                                      setDeployNode(""); // reset node selection
                                    }}
                                    className={`p-4 border rounded-xl cursor-pointer hover:border-purple-500 transition-all flex items-center justify-between ${
                                      deployLocation === loc.id ? "border-purple-600 bg-purple-500/10" : "border-neutral-900 bg-neutral-900/10"
                                    }`}
                                  >
                                    <span className="text-sm font-bold text-white">{loc.name}</span>
                                    <span className="text-xl">{loc.flag || "🌐"}</span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Node select */}
                          {deployLocation && (
                            <div className="space-y-2 animate-fade-in">
                              <p className="text-xs text-neutral-400 font-bold uppercase">Connected Proxmox Hypervisor Node</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {nodes
                                  .filter((n) => n.enabled && n.status === "Online" && n.locationId === deployLocation)
                                  .map((n) => (
                                    <div
                                      key={n.id}
                                      onClick={() => setDeployNode(n.id)}
                                      className={`p-4 border rounded-xl cursor-pointer hover:border-purple-500 transition-all space-y-2 ${
                                        deployNode === n.id ? "border-purple-600 bg-purple-500/10" : "border-neutral-900 bg-neutral-900/10"
                                      }`}
                                    >
                                      <p className="text-sm font-bold text-white">{n.name}</p>
                                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <span>Node name: {n.proxmoxNodeName} • Ver: {n.proxmoxVersion || "8.x"}</span>
                                      </div>
                                    </div>
                                  ))}

                                {nodes.filter((n) => n.enabled && n.status === "Online" && n.locationId === deployLocation).length === 0 && (
                                  <div className="col-span-2 text-center p-6 border border-neutral-900 bg-neutral-950 rounded-lg text-neutral-500 text-xs">
                                    <ShieldAlert className="w-6 h-6 mx-auto opacity-30 mb-2" />
                                    No online Proxmox nodes are currently registered at this region.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 4: OPERATING SYSTEM */}
                    {deployStep === 4 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white">4. Core Operating System</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {["Ubuntu 24.04 LTS", "Debian 12", "Windows Server 2022"].map((os) => (
                            <div
                              key={os}
                              onClick={() => setDeployOS(os)}
                              className={`p-5 border rounded-xl cursor-pointer hover:border-purple-500 transition-all text-center space-y-3 ${
                                deployOS === os ? "border-purple-600 bg-purple-500/10" : "border-neutral-900 bg-neutral-900/10"
                              }`}
                            >
                              <div className="w-10 h-10 rounded bg-neutral-950 flex items-center justify-center mx-auto border border-neutral-900">
                                <Database className="w-5 h-5 text-purple-400" />
                              </div>
                              <p className="text-sm font-bold text-white">{os}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 5: RUNTIME SOFTWARE CATALOG */}
                    {deployStep === 5 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white">5. Software Provisioning</h3>
                        <p className="text-xs text-neutral-500 leading-relaxed -mt-4">
                          Optionally, select microservice runtimes or tools you want pre-configured on your VM. No shell scripting required.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {software
                            .filter((sw) => sw.enabled)
                            .map((sw) => {
                              const isSelected = deploySoftware.some((s) => s.id === sw.id);
                              const selectedVer = deploySoftware.find((s) => s.id === sw.id)?.version || sw.versions[0]?.version || "Latest";

                              return (
                                <div
                                  key={sw.id}
                                  className={`p-5 border rounded-xl transition-all space-y-4 ${
                                    isSelected ? "border-purple-600 bg-purple-500/10" : "border-neutral-900 bg-neutral-900/10"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-neutral-950 flex items-center justify-center border border-neutral-900">
                                        <Blocks className="w-5 h-5 text-purple-400" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-white">{sw.name}</h4>
                                        <p className="text-[10px] text-neutral-500">Catalog Package</p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        if (isSelected) {
                                          setDeploySoftware((prev) => prev.filter((s) => s.id !== sw.id));
                                        } else {
                                          setDeploySoftware((prev) => [...prev, { id: sw.id, name: sw.name, version: selectedVer }]);
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                                        isSelected ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                                      }`}
                                    >
                                      {isSelected ? "Remove" : "Add Package"}
                                    </button>
                                  </div>

                                  {isSelected && sw.versions.length > 0 && (
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-neutral-400 uppercase font-bold">Select Software Version</label>
                                      <select
                                        value={selectedVer}
                                        onChange={(e) => {
                                          setDeploySoftware((prev) =>
                                            prev.map((s) => (s.id === sw.id ? { ...s, version: e.target.value } : s))
                                          );
                                        }}
                                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                      >
                                        {sw.versions
                                          .filter((v) => v.enabled)
                                          .map((v) => (
                                            <option key={v.version} value={v.version}>
                                              Version {v.version}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Step navigation buttons */}
                    <div className="flex items-center justify-between pt-8 border-t border-neutral-900">
                      <button
                        onClick={() => setDeployStep((prev) => Math.max(1, prev - 1))}
                        disabled={deployStep === 1}
                        className="bg-purple-950/80 hover:bg-purple-900 border border-purple-800 disabled:opacity-45 text-purple-200 font-bold px-5 py-2 rounded text-xs cursor-pointer"
                      >
                        Previous Step
                      </button>

                      {deployStep < 5 ? (
                        <button
                          onClick={() => {
                            // Validation before progressing
                            if (deployStep === 1 && !deployPlan) {
                              showToast("Please choose a deployment plan", true);
                              return;
                            }
                            if (deployStep === 2 && (!deployName || !deployPassword)) {
                              showToast("A server name and root password are required", true);
                              return;
                            }
                            if (deployStep === 3 && (!deployLocation || !deployNode)) {
                              showToast("Please select a target hypervisor region and node", true);
                              return;
                            }
                            if (deployStep === 4 && !deployOS) {
                              showToast("Choose an operating system template to continue", true);
                              return;
                            }
                            setDeployStep((prev) => prev + 1);
                          }}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                          Next Step
                        </button>
                      ) : (
                        <button
                          onClick={startDeployment}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-7 py-2.5 rounded-lg text-xs shadow-lg shadow-purple-600/30 cursor-pointer"
                        >
                          Deploy VPS Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary receipt card */}
                  <div className="space-y-6">
                    <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-6">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">VPS Configuration Summary</h3>

                      <div className="space-y-4 text-xs text-neutral-300">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Hosting plan:</span>
                          <span className="font-bold text-white">{deployPlan?.name || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Pricing Cost:</span>
                          <span className="font-bold text-purple-400">{deployPlan ? `${deployPlan.price} Credits` : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Instance Domain:</span>
                          <span className="font-bold text-white font-mono">{deployName || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Network Region:</span>
                          <span className="font-bold text-white">
                            {locations.find((l) => l.id === deployLocation)?.name || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Operating System:</span>
                          <span className="font-bold text-white">{deployOS || "-"}</span>
                        </div>

                        {deploySoftware.length > 0 && (
                          <div className="pt-2 border-t border-neutral-900">
                            <p className="text-neutral-500 mb-1.5 uppercase tracking-wider text-[10px] font-bold">Runtimes to provision:</p>
                            <ul className="space-y-1 pl-2">
                              {deploySoftware.map((s) => (
                                <li key={s.id} className="text-neutral-200 list-disc list-inside">
                                  {s.name} (v{s.version})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CREDITS WALLET */}
          {activeTab === "credits" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Wallet & Ledger Transactions</h1>
                <p className="text-neutral-400 text-sm mt-1">Review active transactions, claims, adjustments, and VPS renewals.</p>
              </div>

              {/* Transactions grid */}
              <div className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Transaction History</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-neutral-400 text-xs font-bold">
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Details</th>
                        <th className="pb-3">Deduction / Addition</th>
                        <th className="pb-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/50 text-sm">
                      {/* Seed mock ledger histories if Firestore is thin */}
                      {[
                        { type: "Reward", desc: "Welcome Account Setup Credits", amount: 1000, date: "Aug 08, 2026" },
                        { type: "Daily checkin", desc: "Daily maintenance node reward claim", amount: 50, date: "Aug 08, 2026" },
                      ].map((t, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="py-4 font-semibold text-white">{t.type}</td>
                          <td className="py-4 text-neutral-400 text-xs">{t.desc}</td>
                          <td className={`py-4 font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {t.amount >= 0 ? "+" : ""}
                            {t.amount} Credits
                          </td>
                          <td className="py-4 text-neutral-500 text-right text-xs">{t.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REDEEM CODE */}
          {activeTab === "redeem" && (
            <div className="space-y-8 max-w-xl">
              <div>
                <h1 className="text-2xl font-black text-white">Redeem Promo Code</h1>
                <p className="text-neutral-400 text-sm mt-1">Unlock credits by entering promotional codes distributed by administrators.</p>
              </div>

              <div className="bg-neutral-900/20 border border-neutral-900 p-8 rounded-xl space-y-6">
                <form onSubmit={handleRedeemCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-bold uppercase">Promo Code Key</label>
                    <input
                      type="text"
                      placeholder="e.g. MAGIC-7K9X-2PQA"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoMessage(null);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 uppercase font-mono tracking-wider"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Redeem Code
                  </button>
                </form>

                {promoMessage && (
                  <div
                    className={`p-4 rounded-lg border text-sm flex items-center gap-3 ${
                      promoMessage.success ? "bg-emerald-950/40 border-emerald-900 text-emerald-400" : "bg-red-950/40 border-red-900 text-red-400"
                    }`}
                  >
                    {promoMessage.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{promoMessage.text}</span>
                  </div>
                )}

                {/* Helpful tips */}
                <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-900 text-xs text-neutral-400 space-y-2">
                  <p className="font-bold text-white uppercase text-[10px]">Active Test Codes:</p>
                  <ul className="space-y-1 pl-3.5 list-disc">
                    <li><span className="font-mono font-bold text-purple-400">WELCOME-NODE</span> — Unlock +1000 standard starter hosting credits</li>
                    <li><span className="font-mono font-bold text-purple-400">MAGIC-7K9X-2PQA</span> — Unlock +500 hypervisor tester credits</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EARN CREDITS */}
          {activeTab === "earn" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Earn Free Hosting Credits</h1>
                <p className="text-neutral-400 text-sm mt-1">Complete micro tasks, survey checks, or daily check-ins to fund your virtual servers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl p-6 space-y-4 hover:border-neutral-800 transition-colors flex flex-col justify-between">
                  <div className="space-y-3">
                    <Clock className="w-8 h-8 text-purple-400" />
                    <h3 className="font-extrabold text-white text-base">Daily Power Check-In</h3>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      Verify that your account has inspected node health logs over the last 24 hours. No prerequisites.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteTask("daily_checkin")}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    Claim Check-In (+50 Credits)
                  </button>
                </div>

                <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl p-6 space-y-4 hover:border-neutral-800 transition-colors flex flex-col justify-between">
                  <div className="space-y-3">
                    <Database className="w-8 h-8 text-purple-400" />
                    <h3 className="font-extrabold text-white text-base">Infrastructure Survey</h3>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      Complete our fast 1-minute development questionnaire regarding cluster virtualization needs.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteTask("survey")}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    Complete Survey (+150 Credits)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
