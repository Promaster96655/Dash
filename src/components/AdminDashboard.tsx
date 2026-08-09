import React, { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import SiteLogo, { ICON_MAP, SiteBranding } from "./SiteLogo";
import {
  Server,
  Users,
  Layout,
  PlusCircle,
  Database,
  Globe,
  Lock,
  Compass,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Eye,
  Settings,
  Blocks,
  Container,
  Menu,
  X,
  Edit2
} from "lucide-react";
import { ProxmoxNode, Location, VPSPlan, UserProfile, ActivityLog, SoftwarePackage, IPPool, IPAddress, ProxmoxTemplate } from "../types";

interface AdminDashboardProps {
  userProfile: any;
  firebaseToken: string;
  onClose: () => void;
}

export default function AdminDashboard({ userProfile, firebaseToken, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>("purple");
  const [isSavingTheme, setIsSavingTheme] = useState<boolean>(false);

  // Website Branding (Site Name & Logo)
  const [siteBranding, setSiteBranding] = useState<SiteBranding>({
    siteName: "MagicalNode",
    siteTagline: "VPS Platforms",
    logoType: "icon",
    logoIcon: "Server",
    logoUrl: "",
  });
  const [isSavingBranding, setIsSavingBranding] = useState<boolean>(false);

  useEffect(() => {
    const themeRef = doc(db, "settings", "theme");
    const unsubscribeTheme = onSnapshot(themeRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentTheme(docSnap.data().theme || "purple");
      }
    });

    const brandingRef = doc(db, "settings", "branding");
    const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteBranding({
          siteName: data.siteName || "MagicalNode",
          siteTagline: data.siteTagline || "VPS Platforms",
          logoType: data.logoType || "icon",
          logoIcon: data.logoIcon || "Server",
          logoUrl: data.logoUrl || "",
        });
      }
    });

    return () => {
      unsubscribeTheme();
      unsubscribeBranding();
    };
  }, []);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      await setDoc(doc(db, "settings", "branding"), {
        ...siteBranding,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile.email || "admin",
      });
      showToast("Website name and logo settings saved successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save website settings", true);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveTheme = async (themeName: string) => {
    setIsSavingTheme(true);
    try {
      await setDoc(doc(db, "settings", "theme"), {
        theme: themeName,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile.email || "admin",
      });
      showToast(`Platform theme successfully updated to ${themeName}!`);
    } catch (err: any) {
      showToast(err.message || "Failed to update platform theme", true);
    } finally {
      setIsSavingTheme(false);
    }
  };

  // State caches
  const [nodes, setNodes] = useState<ProxmoxNode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plans, setPlans] = useState<VPSPlan[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [software, setSoftware] = useState<SoftwarePackage[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Connection form states matching Proxmox form screenshot
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [nodeIdLabel, setNodeIdLabel] = useState("GERMANY-1");
  const [isoCode, setIsoCode] = useState("DE");
  const [flagEmoji, setFlagEmoji] = useState("🇩🇪");
  const [countryName, setCountryName] = useState("Germany");
  const [nodeLocation, setNodeLocation] = useState("loc-1");
  const [nodeApiUrl, setNodeApiUrl] = useState("");
  const [proxmoxNodeName, setProxmoxNodeName] = useState("pve");
  const [storageName, setStorageName] = useState("local");
  const [bridgeName, setBridgeName] = useState("vmbr0");
  const [tokenId, setTokenId] = useState("root@pam!dash");
  const [tokenSecret, setTokenSecret] = useState("");
  const [hasSavedTokenSecret, setHasSavedTokenSecret] = useState(false);

  // IP Pools states
  const [ipPools, setIpPools] = useState<IPPool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [poolIps, setPoolIps] = useState<IPAddress[]>([]);
  const [isEditingPool, setIsEditingPool] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [poolName, setPoolName] = useState("");
  const [poolNodeId, setPoolNodeId] = useState("");
  const [poolCidr, setPoolCidr] = useState("10.0.0.0/24");
  const [poolGateway, setPoolGateway] = useState("10.0.0.1");
  const [poolDns, setPoolDns] = useState("1.1.1.1, 8.8.8.8");
  const [poolBridge, setPoolBridge] = useState("vmbr0");
  const [poolVlan, setPoolVlan] = useState("");
  const [poolStartIp, setPoolStartIp] = useState("10.0.0.10");
  const [poolEndIp, setPoolEndIp] = useState("10.0.0.50");
  const [isViewingIps, setIsViewingIps] = useState(false);

  // OS Templates states
  const [templates, setTemplates] = useState<ProxmoxTemplate[]>([]);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateNodeId, setTemplateNodeId] = useState("");
  const [templateVMId, setTemplateVMId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateOS, setTemplateOS] = useState("Ubuntu 24.04 LTS");
  const [templateVersion, setTemplateVersion] = useState("1.0");
  const [templateType, setTemplateType] = useState<"VM" | "LXC">("LXC");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredTemplates, setDiscoveredTemplates] = useState<any[]>([]);
  const [selectedDiscoveryNodeId, setSelectedDiscoveryNodeId] = useState("");

  // Terminal settings 8006
  const [enablePort8006Terminal, setEnablePort8006Terminal] = useState(true);
  const [pveUser, setPveUser] = useState("root");
  const [realm, setRealm] = useState("pam");
  const [pvePassword, setPvePassword] = useState("");
  const [hasSavedPvePassword, setHasSavedPvePassword] = useState(false);

  // Terminal settings SSH/Auto
  const [enableAutoTerminal, setEnableAutoTerminal] = useState(true);
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState("5019");
  const [sshUsername, setSshUsername] = useState("root");
  const [sshPassword, setSshPassword] = useState("");
  const [hasSavedSshPassword, setHasSavedSshPassword] = useState(false);

  const [verifySsl, setVerifySsl] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);

  // Connection test diagnostics
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    version?: string;
    error?: string;
    steps?: { id: string; name: string; status: "pending" | "running" | "success" | "failed"; message?: string }[];
  } | null>(null);

  // Locations form states
  const [locId, setLocId] = useState("");
  const [locName, setLocName] = useState("");
  const [locFlag, setLocFlag] = useState("");

  // Plan creation states
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planCpu, setPlanCpu] = useState("1");
  const [planRam, setPlanRam] = useState("1024");
  const [planStorage, setPlanStorage] = useState("20");

  // User moderation states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Promo Code generator states
  const [promoCode, setPromoCode] = useState("");
  const [promoReward, setPromoReward] = useState("");
  const [promoUses, setPromoUses] = useState("100");

  // Toast Alerts
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const showToast = (text: string, error?: boolean) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const [nodesRes, locsRes, plansRes, usersRes, logsRes, statsRes, swRes] = await Promise.all([
        fetch("/api/nodes", { headers }),
        fetch("/api/locations", { headers }),
        fetch("/api/plans", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/logs", { headers }),
        fetch("/api/admin/stats", { headers }),
        fetch("/api/software", { headers }),
      ]);

      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (locsRes.ok) setLocations(await locsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (swRes.ok) setSoftware(await swRes.json());
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    }
  };

  const fetchIpPools = async () => {
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch("/api/ip-pools", { headers });
      if (res.ok) {
        setIpPools(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch IP pools:", e);
    }
  };

  const fetchPoolIps = async (poolId: string) => {
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch(`/api/ip-pools/${poolId}/ips`, { headers });
      if (res.ok) {
        setPoolIps(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch pool IPs:", e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch("/api/templates", { headers });
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch templates:", e);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchIpPools();
    fetchTemplates();
    const interval = setInterval(() => {
      fetchAdminData();
      fetchIpPools();
      fetchTemplates();
    }, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [firebaseToken]);

  const handleOpenAddNode = () => {
    setEditingNodeId(null);
    setNodeIdLabel("GERMANY-1");
    setIsoCode("DE");
    setFlagEmoji("🇩🇪");
    setCountryName("Germany");
    setNodeLocation("loc-1");
    setNodeApiUrl("");
    setProxmoxNodeName("pve");
    setStorageName("local");
    setBridgeName("vmbr0");
    setTokenId("root@pam!dash");
    setTokenSecret("");
    setHasSavedTokenSecret(false);

    setEnablePort8006Terminal(true);
    setPveUser("root");
    setRealm("pam");
    setPvePassword("");
    setHasSavedPvePassword(false);

    setEnableAutoTerminal(true);
    setSshHost("");
    setSshPort("5019");
    setSshUsername("root");
    setSshPassword("");
    setHasSavedSshPassword(false);

    setVerifySsl(false);
    setTestResult(null);
    setIsAddingNode(true);
  };

  const handleOpenEditNode = (node: ProxmoxNode) => {
    setEditingNodeId(node.id);
    setNodeIdLabel(node.nodeIdLabel || node.name || "GERMANY-1");
    setIsoCode(node.isoCode || "DE");
    setFlagEmoji(node.flagEmoji || "🇩🇪");
    setCountryName(node.countryName || "Germany");
    setNodeLocation(node.locationId || "loc-1");
    setNodeApiUrl(node.apiUrl || "");
    setProxmoxNodeName(node.proxmoxNodeName || "pve");
    setStorageName(node.storageName || "local");
    setBridgeName(node.bridgeName || "vmbr0");
    setTokenId(node.tokenId || "root@pam!dash");
    setTokenSecret("");
    setHasSavedTokenSecret(!!node.hasSavedTokenSecret);

    setEnablePort8006Terminal(node.enablePort8006Terminal ?? true);
    setPveUser(node.pveUser || "root");
    setRealm(node.realm || "pam");
    setPvePassword("");
    setHasSavedPvePassword(!!node.hasSavedPvePassword);

    setEnableAutoTerminal(node.enableAutoTerminal ?? true);
    setSshHost(node.sshHost || "");
    setSshPort(String(node.sshPort || "5019"));
    setSshUsername(node.sshUsername || "root");
    setSshPassword("");
    setHasSavedSshPassword(!!node.hasSavedSshPassword);

    setVerifySsl(false);
    setTestResult(null);
    setIsAddingNode(true);
  };

  const handleTestConnection = async () => {
    if (!nodeApiUrl || !proxmoxNodeName) {
      showToast("Provide API URL and Proxmox Node Name to test diagnostics", true);
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/nodes/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          id: editingNodeId || undefined,
          apiUrl: nodeApiUrl,
          proxmoxNodeName,
          tokenId,
          tokenSecret,
          verifySsl,
          bridge: bridgeName,
          storage: storageName,
        }),
      });

      const data = await res.json();
      setTestingConnection(false);
      if (res.ok && data.success) {
        setTestResult({ tested: true, success: true, version: data.version, steps: data.steps });
        showToast("✓ Proxmox VE connection test successful!");
      } else {
        setTestResult({ tested: true, success: false, error: data.error || "Connection failed", steps: data.steps });
        showToast("✕ Proxmox VE connection test failed.", true);
      }
    } catch (err: any) {
      setTestingConnection(false);
      setTestResult({ tested: true, success: false, error: err.message || "Network timeout" });
      showToast("Connection verification aborted.", true);
    }
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeIdLabel || !nodeApiUrl || !proxmoxNodeName) {
      showToast("Node ID Label, PVE API URL, and Actual Node Name are required.", true);
      return;
    }

    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          id: editingNodeId || undefined,
          name: nodeIdLabel,
          nodeIdLabel,
          isoCode: isoCode || "DE",
          flagEmoji: flagEmoji || "🇩🇪",
          countryName: countryName || "Germany",
          locationId: nodeLocation || "loc-1",
          apiUrl: nodeApiUrl,
          proxmoxNodeName,
          storageName: storageName || "local",
          bridgeName: bridgeName || "vmbr0",
          tokenId,
          tokenSecret,
          enablePort8006Terminal,
          pveUser,
          realm,
          pvePassword,
          enableAutoTerminal,
          sshHost,
          sshPort,
          sshUsername,
          sshPassword,
          verifySsl,
          enabled: true,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        showToast(editingNodeId ? "✓ Proxmox Node updated successfully." : "✓ Proxmox Node registered successfully.");
        setIsAddingNode(false);
        setEditingNodeId(null);
        setTestResult(null);
        fetchAdminData();
      } else {
        showToast(d.error || "Node save failed", true);
      }
    } catch (err) {
      showToast("Save operation failed", true);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm("Are you sure you want to remove this Proxmox node? The VMs deployed on it will remain intact, but client-facing controls will be disconnected.")) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      if (res.ok) {
        showToast("✓ Proxmox node removed successfully.");
        fetchAdminData();
      } else {
        const d = await res.json();
        showToast(d.error || "Node deletion failed", true);
      }
    } catch (err) {}
  };

  // IP Pools handlers
  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName || !poolNodeId || !poolCidr || !poolGateway) {
      showToast("Please complete Pool Name, Node, Subnet CIDR and Gateway", true);
      return;
    }
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseToken}`,
      };
      const body = {
        name: poolName,
        nodeId: poolNodeId,
        cidr: poolCidr,
        gateway: poolGateway,
        dns: poolDns,
        bridge: poolBridge,
        vlan: poolVlan,
        startIp: poolStartIp,
        endIp: poolEndIp,
      };

      const url = editingPoolId ? `/api/ip-pools/${editingPoolId}` : "/api/ip-pools";
      const method = editingPoolId ? "PUT" : "POST";

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        showToast(editingPoolId ? "✓ IP Pool updated successfully" : "✓ IP Pool created and IP ranges auto-generated");
        setIsEditingPool(false);
        setEditingPoolId(null);
        fetchIpPools();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save IP pool", true);
      }
    } catch (err) {
      showToast("Network error saving IP pool", true);
    }
  };

  const handleUpdateIpStatus = async (poolId: string, ipId: string, status: "available" | "reserved") => {
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseToken}`,
      };
      const res = await fetch(`/api/ip-pools/${poolId}/ips/${ipId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`✓ IP Address status updated to ${status}`);
        fetchPoolIps(poolId);
      } else {
        showToast("Failed to update IP address status", true);
      }
    } catch (err) {
      showToast("Error updating IP address status", true);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm("Are you sure you want to delete this IP pool?")) return;
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch(`/api/ip-pools/${poolId}`, { method: "DELETE", headers });
      if (res.ok) {
        showToast("✓ IP pool deleted");
        fetchIpPools();
      } else {
        showToast("Failed to delete IP pool", true);
      }
    } catch (err) {
      showToast("Error deleting IP pool", true);
    }
  };

  // OS Templates handlers
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateNodeId || !templateVMId || !templateName) {
      showToast("Please select Node, VMID and Name for template", true);
      return;
    }
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseToken}`,
      };
      const body = {
        nodeId: templateNodeId,
        templateId: parseInt(templateVMId, 10),
        name: templateName,
        os: templateOS,
        version: templateVersion,
        type: templateType,
      };

      const url = editingTemplateId ? `/api/templates/${editingTemplateId}` : "/api/templates";
      const method = editingTemplateId ? "PUT" : "POST";

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        showToast(editingTemplateId ? "✓ Template configuration saved" : "✓ Template registered successfully");
        setIsEditingTemplate(false);
        setEditingTemplateId(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save template", true);
      }
    } catch (err) {
      showToast("Network error saving template", true);
    }
  };

  const handleDiscoverTemplates = async (nodeId: string) => {
    if (!nodeId) return;
    setIsDiscovering(true);
    setDiscoveredTemplates([]);
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch(`/api/nodes/${nodeId}/discover-templates`, { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscoveredTemplates(data.templates || []);
        showToast(`Found ${data.templates?.length || 0} templates on hypervisor node`);
      } else {
        showToast(data.error || "Failed to scan hypervisor node templates", true);
      }
    } catch (err) {
      showToast("Error scanning hypervisor templates", true);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleImportDiscoveredTemplate = async (dt: any) => {
    if (!selectedDiscoveryNodeId) return;
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseToken}`,
      };
      const body = {
        nodeId: selectedDiscoveryNodeId,
        templateId: dt.vmid,
        name: dt.name || `Template ${dt.vmid}`,
        os: dt.name.toLowerCase().includes("ubuntu") ? "Ubuntu 24.04 LTS" : dt.name.toLowerCase().includes("debian") ? "Debian 12" : "Alpine Linux 3.20",
        version: "1.0",
        type: dt.type === "qemu" ? "VM" : "LXC",
      };

      const res = await fetch("/api/templates", { method: "POST", headers, body: JSON.stringify(body) });
      if (res.ok) {
        showToast(`✓ Template ${dt.name} imported to registry`);
        setDiscoveredTemplates((prev) => prev.filter((item) => item.vmid !== dt.vmid));
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to import template", true);
      }
    } catch (err) {
      showToast("Error importing template", true);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to remove this OS template registration?")) return;
    try {
      const headers = { Authorization: `Bearer ${firebaseToken}` };
      const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE", headers });
      if (res.ok) {
        showToast("✓ OS template removed");
        fetchTemplates();
      } else {
        showToast("Failed to delete OS template", true);
      }
    } catch (err) {
      showToast("Error deleting OS template", true);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locId || !locName) return;

    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ id: locId, name: locName, flag: locFlag }),
      });
      if (res.ok) {
        showToast("✓ DC Region registered successfully.");
        setLocId("");
        setLocName("");
        setLocFlag("");
        fetchAdminData();
      }
    } catch (err) {}
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planPrice) return;

    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          name: planName,
          price: planPrice,
          cpu: planCpu,
          ram: planRam,
          storage: planStorage,
        }),
      });
      if (res.ok) {
        showToast("✓ Standard hosting plan published.");
        setPlanName("");
        setPlanPrice("");
        setPlanCpu("1");
        setPlanRam("1024");
        setPlanStorage("20");
        fetchAdminData();
      }
    } catch (err) {}
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoReward) return;

    try {
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          code: promoCode,
          reward: promoReward,
          maxUses: promoUses,
        }),
      });
      if (res.ok) {
        showToast("✓ Promotional promo code minted successfully!");
        setPromoCode("");
        setPromoReward("");
        setPromoUses("100");
        fetchAdminData();
      }
    } catch (err) {}
  };

  const handleAdjustCredits = async (uid: string, type: "add" | "remove") => {
    if (!creditAdjustment) return;
    try {
      const res = await fetch(`/api/admin/users/${uid}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ amount: creditAdjustment, actionType: type }),
      });
      if (res.ok) {
        showToast("✓ User credit balance modified successfully.");
        setCreditAdjustment("");
        setSelectedUser(null);
        fetchAdminData();
      }
    } catch (err) {}
  };

  const handleToggleUserSuspend = async (user: UserProfile) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/users/${user.uid}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`User account toggled to ${nextStatus}.`);
        fetchAdminData();
      }
    } catch (err) {}
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent text-neutral-100 flex font-sans antialiased">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-2xl border flex items-center gap-3 transition-all transform animate-slide-in ${
            toast.error ? "bg-red-950/90 border-red-850 text-red-200" : "bg-neutral-900/90 border-neutral-800 text-neutral-200"
          }`}
        >
          {toast.error ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-purple-400" />}
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

      {/* Admin Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 border-r border-neutral-900 bg-neutral-950/95 md:bg-neutral-950/70 backdrop-blur-md flex flex-col justify-between shrink-0`}>
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-neutral-900">
            <SiteLogo branding={siteBranding} customTagline="Admin Panel" />
          </div>

          {/* Nav buttons */}
          <nav className="p-4 space-y-1.5 flex-1">
            {[
              { id: "dashboard", label: "Overview", icon: Layout },
              { id: "nodes", label: "Proxmox Nodes", icon: Server },
              { id: "ippools", label: "Network IP Pools", icon: Blocks },
              { id: "templates", label: "OS Templates", icon: Container },
              { id: "users", label: "User Accounts", icon: Users },
              { id: "regions", label: "DC Locations", icon: Globe },
              { id: "plans", label: "VPS Plans", icon: Database },
              { id: "promo", label: "Promo Codes", icon: Compass },
              { id: "logs", label: "Audit Logs", icon: Activity },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
                }`}
              >
                <tab.icon className="w-4.5 h-4.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-900">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              onClose();
            }}
            className="w-full bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 font-bold text-xs py-2.5 rounded-lg text-center cursor-pointer transition-colors"
          >
            Close Admin Panel
          </button>
        </div>
      </aside>

      {/* Main Admin Contents */}
      <main className="flex-1 bg-transparent flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-900 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-300 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider hidden sm:inline">
              Infrastructure Console Control Room
            </span>
          </div>
          <span className="text-[10px] sm:text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-0.5 sm:px-3 sm:py-1 rounded font-bold font-mono shrink-0">
            SECURE RESTRICTED SESSION
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && stats && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white">Global Infrastructure Analytics</h1>
                <p className="text-neutral-400 text-sm mt-1">Real-time status summaries of active VMs, transactions, and hypervisor networks.</p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Total Registers</p>
                  <p className="text-3xl font-black text-white">{stats.totalUsers} Users</p>
                  <p className="text-[10px] text-neutral-500">Active accounts: {stats.activeUsers}</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Virtual Private Servers</p>
                  <p className="text-3xl font-black text-white">{stats.totalVps} VM Networks</p>
                  <p className="text-[10px] text-neutral-500">Running: {stats.runningVps} • Stopped: {stats.stoppedVps}</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Active Proxmox Connections</p>
                  <p className="text-3xl font-black text-emerald-400">{stats.onlineNodes} Online</p>
                  <p className="text-[10px] text-neutral-500">Disabled nodes: {stats.offlineNodes}</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-6 space-y-2">
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Total Credits Spent</p>
                  <p className="text-3xl font-black text-white">{stats.creditsUsed} Credits</p>
                  <p className="text-[10px] text-neutral-500">Distributed starter credits: {stats.creditsDistributed}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROXMOX NODES MANAGEMENT */}
          {activeTab === "nodes" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Proxmox VE Hypervisors</h1>
                  <p className="text-neutral-400 text-sm mt-1">Add, update, disable, and verify real-time Proxmox API integration endpoints.</p>
                </div>
                <button
                  onClick={handleOpenAddNode}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Node
                </button>
              </div>

              {/* Node Setup / Edit Modal Form */}
              {isAddingNode && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-slide-in shadow-2xl">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                    <div>
                      <h3 className="font-black text-white text-lg flex items-center gap-2">
                        <Server className="w-5 h-5 text-cyan-400" />
                        {editingNodeId ? "Edit Proxmox Node" : "Register Proxmox Node"}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Configure Proxmox connection credentials & terminal tunnels
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNode(false);
                        setEditingNodeId(null);
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveNode} className="space-y-6">
                    {/* Grid Row 1: NODE ID LABEL, ISO CODE, FLAG EMOJI */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          Node ID Label
                        </label>
                        <input
                          type="text"
                          placeholder="GERMANY-1"
                          value={nodeIdLabel}
                          onChange={(e) => setNodeIdLabel(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          ISO Code
                        </label>
                        <input
                          type="text"
                          placeholder="DE"
                          value={isoCode}
                          onChange={(e) => setIsoCode(e.target.value.toUpperCase())}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium uppercase focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          Flag Emoji
                        </label>
                        <input
                          type="text"
                          placeholder="🇩🇪"
                          value={flagEmoji}
                          onChange={(e) => setFlagEmoji(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Row 2: COUNTRY LOCATION NAME */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                        Country Location Name
                      </label>
                      <input
                        type="text"
                        placeholder="Germany"
                        value={countryName}
                        onChange={(e) => setCountryName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Row 3: PROXMOX PVE API URL */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                        Proxmox PVE API URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://192.168.10.50:8006 or https://demo.magicalnode.com"
                        value={nodeApiUrl}
                        onChange={(e) => setNodeApiUrl(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Row 4: ACTUAL PROXMOX NODE NAME (BACK NAME) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          Actual Proxmox Node Name (Back Name)
                        </label>
                        <button
                          type="button"
                          onClick={() => setProxmoxNodeName(nodeIdLabel.toLowerCase().replace(/[^a-z0-9]/g, "") || "pve")}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                        >
                          Copy from ID Label.
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="pve"
                        value={proxmoxNodeName}
                        onChange={(e) => setProxmoxNodeName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <p className="text-[11px] text-neutral-500 italic">
                        * The actual physical hostname of the node inside your Proxmox cluster e.g. 'pve', 'pve1'.
                      </p>
                    </div>

                    {/* Row 5: PROXMOX STORAGE NAME */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          Proxmox Storage Name
                        </label>
                        <input
                          type="text"
                          placeholder="local"
                          value={storageName}
                          onChange={(e) => setStorageName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-[10px] text-neutral-500 italic mt-0.5">
                          * VM/LXC disks storage allocation e.g. 'local', 'local-lvm', 'ceph'.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          Default Network Bridge
                        </label>
                        <input
                          type="text"
                          placeholder="vmbr0"
                          value={bridgeName}
                          onChange={(e) => setBridgeName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-[10px] text-neutral-500 italic mt-0.5">
                          * Physical network bridge for VPS network interfaces e.g. 'vmbr0'.
                        </p>
                      </div>
                    </div>

                    {/* Row 6: PVE TOKEN ID & TOKEN SECRET KEY */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                          PVE Token ID
                        </label>
                        <input
                          type="text"
                          placeholder="root@pam!dash"
                          value={tokenId}
                          onChange={(e) => setTokenId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">
                            Token Secret Key
                          </label>
                          {hasSavedTokenSecret && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/30">
                              SAVED
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          placeholder={hasSavedTokenSecret ? "••••••••••••••••" : "Enter Token Secret"}
                          value={tokenSecret}
                          onChange={(e) => setTokenSecret(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Section Box 1: PROXMOX PORT 8006 / HTTPS TUNNEL TERMINAL LOGIN */}
                    <div className="border border-cyan-900/40 bg-slate-950/60 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/30 pb-2.5">
                        <span className="text-xs font-black text-cyan-400 tracking-wider uppercase">
                          Proxmox Port 8006 / HTTPS Tunnel Terminal Login (Highly Recommended)
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnablePort8006Terminal(!enablePort8006Terminal)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            enablePort8006Terminal
                              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                              : "bg-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {enablePort8006Terminal ? "Enable Port 8006 Terminal" : "Disable Port 8006 Terminal"}
                        </button>
                      </div>

                      {enablePort8006Terminal && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase">PVE User</label>
                            <input
                              type="text"
                              placeholder="root"
                              value={pveUser}
                              onChange={(e) => setPveUser(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase">Realm</label>
                            <input
                              type="text"
                              placeholder="pam"
                              value={realm}
                              onChange={(e) => setRealm(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-neutral-400 font-bold uppercase">Password</label>
                              {hasSavedPvePassword && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  SAVED
                                </span>
                              )}
                            </div>
                            <input
                              type="password"
                              placeholder={hasSavedPvePassword ? "••••••••••••••••" : "PVE Password"}
                              value={pvePassword}
                              onChange={(e) => setPvePassword(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section Box 2: TERMINAL ACCESS SETTINGS (PAM / SSH TUNNEL LOGIN) */}
                    <div className="border border-cyan-900/40 bg-slate-950/60 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/30 pb-2.5">
                        <span className="text-xs font-black text-cyan-400 tracking-wider uppercase">
                          Terminal Access Settings (PAM / SSH Tunnel Login)
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnableAutoTerminal(!enableAutoTerminal)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            enableAutoTerminal
                              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                              : "bg-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {enableAutoTerminal ? "Enabled Auto Terminal" : "Disable Auto Terminal"}
                        </button>
                      </div>

                      {enableAutoTerminal && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase">SSH Host/IP (e.g. Tailscale IP)</label>
                            <input
                              type="text"
                              placeholder="dearbeast.localto.net"
                              value={sshHost}
                              onChange={(e) => setSshHost(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase">SSH Port</label>
                            <input
                              type="text"
                              placeholder="5019"
                              value={sshPort}
                              onChange={(e) => setSshPort(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase">SSH Username</label>
                            <input
                              type="text"
                              placeholder="root"
                              value={sshUsername}
                              onChange={(e) => setSshUsername(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-neutral-400 font-bold uppercase">SSH / PAM Password</label>
                              {hasSavedSshPassword && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  SAVED
                                </span>
                              )}
                            </div>
                            <input
                              type="password"
                              placeholder={hasSavedSshPassword ? "••••••••••••••••" : "SSH Password"}
                              value={sshPassword}
                              onChange={(e) => setSshPassword(e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Diagnostics Terminal */}
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                          Proxmox API Diagnostic Terminal
                        </span>
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-40"
                        >
                          {testingConnection ? "Testing..." : "Test Connection"}
                        </button>
                      </div>

                      {testResult && (
                        <div className="font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 mb-1.5">
                            <span className="text-neutral-400">Target Endpoint Status:</span>
                            <span className={testResult.success ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                              {testResult.success ? "✓ API Connected" : "✕ Failed"}
                            </span>
                          </div>

                          {testResult.steps && testResult.steps.length > 0 && (
                            <div className="space-y-1.5 bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-900">
                              {testResult.steps.map((step) => (
                                <div key={step.id} className="flex items-start gap-2 text-[11px]">
                                  {step.status === "success" && <span className="text-emerald-400 font-bold">✓</span>}
                                  {step.status === "failed" && <span className="text-red-500 font-bold">✕</span>}
                                  {step.status === "running" && <span className="text-purple-400 animate-spin">⟳</span>}
                                  {step.status === "pending" && <span className="text-neutral-600">○</span>}
                                  <div className="flex-1">
                                    <span className="text-neutral-300 font-bold">{step.name}</span>
                                    {step.message && (
                                      <p className="text-[10px] text-neutral-400 italic font-mono mt-0.5 ml-2 border-l border-neutral-800 pl-1.5">
                                        {step.message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {testResult.success ? (
                            <p className="text-[10px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">Proxmox Version: {testResult.version}</p>
                          ) : (
                            <p className="text-[10px] text-red-400 leading-relaxed bg-red-950/30 p-2 rounded border border-red-900/40">
                              Cause: {testResult.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footnote */}
                    <p className="text-xs text-neutral-400 italic">
                      * Node currently has a secure API token saved in Firestore. Leave blank to keep it.
                    </p>

                    {/* Submit button */}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 px-6 rounded-xl shadow-lg shadow-purple-600/25 text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {editingNodeId ? "Save Node Changes" : "Add Node"}
                    </button>
                  </form>
                </div>
              )}

              {/* Node dashboard grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="border border-neutral-800 bg-neutral-900/30 rounded-2xl p-6 space-y-4 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{node.flagEmoji || "🌐"}</span>
                        <div>
                          <h3 className="font-extrabold text-white text-base">{node.nodeIdLabel || node.name}</h3>
                          <p className="text-xs text-neutral-400">
                            {node.countryName || node.locationId} ({node.isoCode || "DE"})
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        {node.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center bg-neutral-950 p-3.5 rounded-xl border border-neutral-900">
                      <div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">CPUs</p>
                        <p className="text-sm font-black text-white">{node.cpuUsage ?? 15}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">RAM</p>
                        <p className="text-sm font-black text-white">{node.ramUsage ?? 52}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">Disk</p>
                        <p className="text-sm font-black text-white">{node.storageUsage ?? 41}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
                      <span>Proxmox Node: <span className="font-mono text-cyan-400 font-bold">{node.proxmoxNodeName}</span></span>
                      <span>Storage: <span className="font-mono text-white">{node.storageName || "local"}</span></span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-800/80">
                      <button
                        onClick={() => handleOpenEditNode(node)}
                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Edit Credentials
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="bg-neutral-900 hover:bg-red-950/80 hover:text-red-400 text-neutral-400 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {nodes.length === 0 && (
                  <div className="col-span-2 text-center py-16 border border-neutral-800 bg-neutral-900/20 rounded-2xl text-neutral-500 space-y-3">
                    <Server className="w-10 h-10 mx-auto text-neutral-600" />
                    <p className="text-sm">No Proxmox Hypervisors configured yet.</p>
                    <button
                      onClick={handleOpenAddNode}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      Register First Node
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: NETWORK IP POOLS */}
          {activeTab === "ippools" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">IPv4 Pool Management</h1>
                  <p className="text-neutral-400 text-sm mt-1">Configure static IPv4 pools with automated range generation for hypervisor nodes.</p>
                </div>
                {!isEditingPool && !isViewingIps && (
                  <button
                    onClick={() => {
                      setEditingPoolId(null);
                      setPoolName("");
                      setPoolNodeId(nodes[0]?.id || "");
                      setPoolCidr("10.0.0.0/24");
                      setPoolGateway("10.0.0.1");
                      setPoolDns("1.1.1.1, 8.8.8.8");
                      setPoolBridge("vmbr0");
                      setPoolVlan("");
                      setPoolStartIp("10.0.0.10");
                      setPoolEndIp("10.0.0.50");
                      setIsEditingPool(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create IP Pool
                  </button>
                )}
              </div>

              {/* Pool Creation / Edit Form */}
              {isEditingPool && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-slide-in shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                    <h3 className="font-black text-white text-lg flex items-center gap-2">
                      <Blocks className="w-5 h-5 text-purple-400" />
                      {editingPoolId ? "Edit IPv4 Network Pool" : "Define New IPv4 Network Pool"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPool(false);
                        setEditingPoolId(null);
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePool} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Pool Friendly Name</label>
                        <input
                          type="text"
                          placeholder="e.g. India Primary Node 1 Range"
                          value={poolName}
                          onChange={(e) => setPoolName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Target Proxmox Node</label>
                        <select
                          value={poolNodeId}
                          onChange={(e) => setPoolNodeId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Select a node...</option>
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>{n.nodeIdLabel || n.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Subnet CIDR</label>
                        <input
                          type="text"
                          placeholder="e.g. 10.0.0.0/24"
                          value={poolCidr}
                          onChange={(e) => setPoolCidr(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Gateway Address</label>
                        <input
                          type="text"
                          placeholder="e.g. 10.0.0.1"
                          value={poolGateway}
                          onChange={(e) => setPoolGateway(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">DNS Servers (comma separated)</label>
                        <input
                          type="text"
                          placeholder="1.1.1.1, 8.8.8.8"
                          value={poolDns}
                          onChange={(e) => setPoolDns(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Proxmox Network Bridge</label>
                        <input
                          type="text"
                          placeholder="vmbr0"
                          value={poolBridge}
                          onChange={(e) => setPoolBridge(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">VLAN Tag (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 100 (leave blank for no VLAN)"
                          value={poolVlan}
                          onChange={(e) => setPoolVlan(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-purple-900/30 p-5 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider">IP Addresses Generation Range</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed italic">
                        * Inputting the range start and end IPs below will auto-generate individual records in Firestore. 
                        Changing these on an existing pool will preserve already assigned IPs but may generate additional missing allocations.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Range Start IP</label>
                          <input
                            type="text"
                            placeholder="e.g. 10.0.0.10"
                            value={poolStartIp}
                            onChange={(e) => setPoolStartIp(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Range End IP</label>
                          <input
                            type="text"
                            placeholder="e.g. 10.0.0.50"
                            value={poolEndIp}
                            onChange={(e) => setPoolEndIp(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-6 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      {editingPoolId ? "Save IP Pool Changes" : "Create IP Pool & Auto-generate Ranges"}
                    </button>
                  </form>
                </div>
              )}

              {/* IP Allocations Explorer Drill Down */}
              {isViewingIps && selectedPoolId && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsViewingIps(false);
                          setSelectedPoolId(null);
                        }}
                        className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        ← Back to Pools
                      </button>
                      <h3 className="font-extrabold text-white text-lg">
                        Pool Allocation Directory: <span className="text-purple-400 font-mono text-base">{ipPools.find((p) => p.id === selectedPoolId)?.name}</span>
                      </h3>
                    </div>
                    <button
                      onClick={() => fetchPoolIps(selectedPoolId)}
                      className="bg-neutral-900/60 border border-neutral-850 hover:bg-neutral-800 text-neutral-300 p-2 rounded-lg cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-neutral-900/20 border border-neutral-900 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-900 uppercase tracking-wider text-[10px]">
                          <th className="p-4">IP Address</th>
                          <th className="p-4">Allocation Status</th>
                          <th className="p-4">Associated VPS / VM</th>
                          <th className="p-4 text-right">Administrative Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 font-medium">
                        {poolIps.map((ip) => (
                          <tr key={ip.id} className="hover:bg-neutral-950/40">
                            <td className="p-4 font-mono text-sm text-white font-bold">{ip.ip}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ip.status === "available" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                ip.status === "reserved" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  ip.status === "available" ? "bg-emerald-400" :
                                  ip.status === "reserved" ? "bg-amber-400" : "bg-indigo-400"
                                }`}></span>
                                {ip.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-neutral-400">
                              {ip.vpsId ? (
                                <span className="bg-indigo-950/40 border border-indigo-900 text-indigo-300 px-2 py-0.5 rounded text-[10px]">
                                  VPS-ID: {ip.vpsId}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-4 text-right flex justify-end gap-1.5">
                              {ip.status !== "available" && (
                                <button
                                  onClick={() => handleUpdateIpStatus(selectedPoolId, ip.id, "available")}
                                  className="text-[10px] bg-emerald-950/55 text-emerald-400 hover:bg-emerald-900 border border-emerald-900 px-2 py-1 rounded cursor-pointer font-bold transition-colors"
                                >
                                  Release to Available
                                </button>
                              )}
                              {ip.status === "available" && (
                                <button
                                  onClick={() => handleUpdateIpStatus(selectedPoolId, ip.id, "reserved")}
                                  className="text-[10px] bg-amber-950/55 text-amber-400 hover:bg-amber-900 border border-amber-900 px-2 py-1 rounded cursor-pointer font-bold transition-colors"
                                >
                                  Reserve IP
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {poolIps.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-neutral-500 italic">
                              No generated IP records found for this pool. Click Save Pool to trigger ranges generation.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* IP Pools Directory */}
              {!isEditingPool && !isViewingIps && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ipPools.map((pool) => {
                    const nodeName = nodes.find((n) => n.id === pool.nodeId)?.nodeIdLabel || "Unknown Node";
                    return (
                      <div
                        key={pool.id}
                        className="border border-neutral-800 bg-neutral-900/30 rounded-2xl p-6 space-y-4 hover:border-neutral-700 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-extrabold text-white text-base">{pool.name}</h3>
                              <p className="text-xs text-neutral-400">Node: <span className="font-mono text-cyan-400">{nodeName}</span></p>
                            </div>
                            <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              VLAN: {pool.vlan || "None"}
                            </span>
                          </div>

                          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 text-xs font-mono space-y-1.5 text-neutral-300">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Subnet:</span>
                              <span>{pool.cidr}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Gateway:</span>
                              <span>{pool.gateway}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">DNS:</span>
                              <span className="truncate max-w-[150px]">{pool.dns}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Bridge:</span>
                              <span>{pool.bridge}</span>
                            </div>
                            <div className="flex justify-between border-t border-neutral-900 pt-1.5 mt-1.5 text-[10px]">
                              <span className="text-neutral-500">Range:</span>
                              <span className="text-neutral-400 font-bold">{pool.startIp} - {pool.endIp.split(".").pop()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => {
                              setSelectedPoolId(pool.id);
                              fetchPoolIps(pool.id);
                              setIsViewingIps(true);
                            }}
                            className="w-full bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 hover:border-purple-600 font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View & Manage Allocation IPs
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPoolId(pool.id);
                                setPoolName(pool.name);
                                setPoolNodeId(pool.nodeId);
                                setPoolCidr(pool.cidr);
                                setPoolGateway(pool.gateway);
                                setPoolDns(pool.dns);
                                setPoolBridge(pool.bridge || "vmbr0");
                                setPoolVlan(pool.vlan || "");
                                setPoolStartIp(pool.startIp || "");
                                setPoolEndIp(pool.endIp || "");
                                setIsEditingPool(true);
                              }}
                              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit Pool Params
                            </button>
                            <button
                              onClick={() => handleDeletePool(pool.id)}
                              className="bg-neutral-900 hover:bg-red-950/80 hover:text-red-400 text-neutral-400 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {ipPools.length === 0 && (
                    <div className="col-span-full text-center py-16 border border-neutral-800 bg-neutral-900/20 rounded-2xl text-neutral-500 space-y-3">
                      <Blocks className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
                      <p className="text-sm">No static IPv4 Pools defined yet.</p>
                      <button
                        onClick={() => {
                          setEditingPoolId(null);
                          setPoolName("");
                          setPoolNodeId(nodes[0]?.id || "");
                          setPoolCidr("10.0.0.0/24");
                          setPoolGateway("10.0.0.1");
                          setPoolDns("1.1.1.1, 8.8.8.8");
                          setPoolBridge("vmbr0");
                          setPoolVlan("");
                          setPoolStartIp("10.0.0.10");
                          setPoolEndIp("10.0.0.50");
                          setIsEditingPool(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Create First IP Pool
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: OS TEMPLATES CONFIGURATION */}
          {activeTab === "templates" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">OS Template Registry</h1>
                  <p className="text-neutral-400 text-sm mt-1">Register real Proxmox VM Templates (QEMU Cloud-Init) or LXC Container templates.</p>
                </div>
                {!isEditingTemplate && (
                  <button
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTemplateNodeId(nodes[0]?.id || "");
                      setTemplateVMId("8000");
                      setTemplateName("Ubuntu 24.04 LTS");
                      setTemplateOS("Ubuntu 24.04 LTS");
                      setTemplateVersion("1.0");
                      setTemplateType("LXC");
                      setIsEditingTemplate(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Template Config
                  </button>
                )}
              </div>

              {/* Template Registration / Edit Form */}
              {isEditingTemplate && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-slide-in shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                    <h3 className="font-black text-white text-lg flex items-center gap-2">
                      <Container className="w-5 h-5 text-indigo-400" />
                      {editingTemplateId ? "Edit Hypervisor OS Template" : "Register Hypervisor OS Template"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTemplate(false);
                        setEditingTemplateId(null);
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTemplate} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Target Proxmox Node</label>
                        <select
                          value={templateNodeId}
                          onChange={(e) => setTemplateNodeId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Select a node...</option>
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>{n.nodeIdLabel || n.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Virtualization Type</label>
                        <select
                          value={templateType}
                          onChange={(e) => setTemplateType(e.target.value as "VM" | "LXC")}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        >
                          <option value="LXC">LXC (Container Template)</option>
                          <option value="VM">QEMU VM (Cloud-Init Image Template)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Proxmox VMID / CTID</label>
                        <input
                          type="number"
                          placeholder="e.g. 8000 or 9000"
                          value={templateVMId}
                          onChange={(e) => setTemplateVMId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">Display Name (Client Facing)</label>
                        <input
                          type="text"
                          placeholder="e.g. Ubuntu 24.04 LTS (HVM)"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-wider">OS Category Family</label>
                        <select
                          value={templateOS}
                          onChange={(e) => setTemplateOS(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-purple-500"
                        >
                          <option value="Ubuntu 24.04 LTS">Ubuntu Linux</option>
                          <option value="Debian 12">Debian Linux</option>
                          <option value="Alpine Linux 3.20">Alpine Linux</option>
                          <option value="CentOS Stream 9">CentOS / RHEL</option>
                          <option value="Rocky Linux 9">Rocky Linux</option>
                          <option value="Windows Server 2022">Windows Server</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-6 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      {editingTemplateId ? "Save OS Template Changes" : "Register OS Template Endpoint"}
                    </button>
                  </form>
                </div>
              )}

              {/* Proxmox Node Auto Template Discoverer */}
              {!isEditingTemplate && (
                <div className="bg-slate-950/60 border border-indigo-950/50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
                    Proxmox VE Cluster OS Template Discoverer
                  </h3>
                  <p className="text-neutral-400 text-xs">
                    Connect directly to an online Proxmox VE hypervisor and discover all existing VM templates (QEMU) and LXC CT templates inside the cluster resources. Click import to populate configuration metadata immediately.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <select
                      value={selectedDiscoveryNodeId}
                      onChange={(e) => setSelectedDiscoveryNodeId(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 flex-1"
                    >
                      <option value="">Choose a hypervisor node...</option>
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>{n.nodeIdLabel || n.name} ({n.status})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDiscoverTemplates(selectedDiscoveryNodeId)}
                      disabled={isDiscovering || !selectedDiscoveryNodeId}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
                    >
                      {isDiscovering ? "Scanning Cluster..." : "Scan & Discover Templates"}
                    </button>
                  </div>

                  {discoveredTemplates.length > 0 && (
                    <div className="pt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">Discovered Unregistered Templates:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {discoveredTemplates.map((dt) => (
                          <div
                            key={dt.vmid}
                            className="bg-neutral-900/60 border border-neutral-850 p-3 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <p className="text-white font-bold truncate">{dt.name}</p>
                              <p className="text-[10px] font-mono text-neutral-500">
                                VMID: {dt.vmid} • Type: <span className="text-cyan-400 uppercase font-bold">{dt.type === "qemu" ? "QEMU VM" : "LXC"}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleImportDiscoveredTemplate(dt)}
                              className="bg-neutral-800 hover:bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded transition-colors cursor-pointer"
                            >
                              Import
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OS Templates Directory List */}
              {!isEditingTemplate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((tpl) => {
                    const nodeName = nodes.find((n) => n.id === tpl.nodeId)?.nodeIdLabel || "Unknown Node";
                    return (
                      <div
                        key={tpl.id}
                        className="border border-neutral-800 bg-neutral-900/30 rounded-2xl p-6 space-y-4 hover:border-neutral-700 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-extrabold text-white text-base">{tpl.name}</h3>
                              <p className="text-xs text-neutral-400">Node: <span className="font-mono text-cyan-400">{nodeName}</span></p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                              tpl.type === "VM" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                              {tpl.type}
                            </span>
                          </div>

                          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-900 text-xs font-mono space-y-1 text-neutral-300">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">PVE VMID:</span>
                              <span className="text-white font-bold">{tpl.templateId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">OS Category:</span>
                              <span>{tpl.os}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Config Ver:</span>
                              <span>{tpl.version || "1.0"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-neutral-900/40">
                          <button
                            onClick={() => {
                              setEditingTemplateId(tpl.id);
                              setTemplateNodeId(tpl.nodeId);
                              setTemplateVMId(String(tpl.templateId));
                              setTemplateName(tpl.name);
                              setTemplateOS(tpl.os);
                              setTemplateVersion(tpl.version || "1.0");
                              setTemplateType(tpl.type);
                              setIsEditingTemplate(true);
                            }}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Edit Config
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="bg-neutral-900 hover:bg-red-950/80 hover:text-red-400 text-neutral-400 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {templates.length === 0 && (
                    <div className="col-span-full text-center py-16 border border-neutral-800 bg-neutral-900/20 rounded-2xl text-neutral-500 space-y-3">
                      <Container className="w-10 h-10 mx-auto text-neutral-600 animate-pulse" />
                      <p className="text-sm">No registered OS Templates configurations found.</p>
                      <button
                        onClick={() => {
                          setEditingTemplateId(null);
                          setTemplateNodeId(nodes[0]?.id || "");
                          setTemplateVMId("8000");
                          setTemplateName("Ubuntu 24.04 LTS");
                          setTemplateOS("Ubuntu 24.04 LTS");
                          setTemplateVersion("1.0");
                          setTemplateType("LXC");
                          setIsEditingTemplate(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Add First Template Config
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: MANAGING USERS */}
          {activeTab === "users" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white">User Accounts</h1>
                <p className="text-neutral-400 text-sm mt-1">Review register, adjust credit limits, or toggle account access privileges.</p>
              </div>

              {/* Search user */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search users by name or email address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-neutral-900 border border-neutral-850 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 flex-1"
                />
              </div>

              {/* User Moderation card popup */}
              {selectedUser && (
                <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6 space-y-4 animate-slide-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-base">Modify Balance: {selectedUser.name}</h4>
                      <p className="text-xs text-neutral-500">{selectedUser.email} • Current Balance: {selectedUser.credits} Cr</p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Close Form
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Amount of credits"
                      value={creditAdjustment}
                      onChange={(e) => setCreditAdjustment(e.target.value)}
                      className="bg-neutral-950 border border-neutral-900 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 w-48"
                    />
                    <button
                      onClick={() => handleAdjustCredits(selectedUser.uid, "add")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded cursor-pointer"
                    >
                      Add Credits
                    </button>
                    <button
                      onClick={() => handleAdjustCredits(selectedUser.uid, "remove")}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded cursor-pointer"
                    >
                      Deduct Credits
                    </button>
                  </div>
                </div>
              )}

              {/* Users table */}
              <div className="border border-neutral-900 bg-neutral-900/10 rounded-xl p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-400 text-xs font-bold pb-3">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Credits</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Moderations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/40 text-sm">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-neutral-900/20">
                        <td className="py-4 font-bold text-white">{u.name}</td>
                        <td className="py-4 text-neutral-400">{u.email}</td>
                        <td className="py-4 font-extrabold text-purple-400">{u.credits} Cr</td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                              u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="text-xs bg-purple-600/10 text-purple-400 px-3 py-1.5 rounded hover:bg-purple-600 hover:text-white transition-all cursor-pointer font-bold"
                          >
                            Adjust Balance
                          </button>
                          <button
                            onClick={() => handleToggleUserSuspend(u)}
                            className={`text-xs px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                              u.status === "active" ? "bg-red-950/20 text-red-400 hover:bg-red-600 hover:text-white" : "bg-emerald-950/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                            }`}
                          >
                            {u.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DC REGIONS */}
          {activeTab === "regions" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add */}
                <div className="bg-neutral-900/20 border border-neutral-900 p-6 rounded-xl space-y-4 h-fit">
                  <h3 className="font-bold text-white text-base">Add DC Location</h3>
                  <form onSubmit={handleSaveLocation} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Location ID (slug)</label>
                      <input
                        type="text"
                        placeholder="india"
                        value={locId}
                        onChange={(e) => setLocId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Location Display Name</label>
                      <input
                        type="text"
                        placeholder="India"
                        value={locName}
                        onChange={(e) => setLocName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Region Flag emoji</label>
                      <input
                        type="text"
                        placeholder="🇮🇳"
                        value={locFlag}
                        onChange={(e) => setLocFlag(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs transition-colors shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      Save Location
                    </button>
                  </form>
                </div>

                {/* List table */}
                <div className="lg:col-span-2 border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-base">DC Location Pools</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {locations.map((loc) => (
                      <div key={loc.id} className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{loc.flag || "🌐"}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{loc.name}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">ID: {loc.id}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VPS PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add */}
                <div className="bg-neutral-900/20 border border-neutral-900 p-6 rounded-xl space-y-4 h-fit">
                  <h3 className="font-bold text-white text-base">Create VPS Plan</h3>
                  <form onSubmit={handleSavePlan} className="space-y-4 text-sm">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Plan name</label>
                      <input
                        type="text"
                        placeholder="VPS BASIC"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Renewal price (credits)</label>
                      <input
                        type="number"
                        placeholder="250"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Cores allocation</label>
                      <input
                        type="number"
                        value={planCpu}
                        onChange={(e) => setPlanCpu(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">RAM Allocation (MB)</label>
                      <input
                        type="number"
                        value={planRam}
                        onChange={(e) => setPlanRam(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Disk Allocation (GB)</label>
                      <input
                        type="number"
                        value={planStorage}
                        onChange={(e) => setPlanStorage(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      Publish Plan
                    </button>
                  </form>
                </div>

                {/* List table */}
                <div className="lg:col-span-2 border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-base">Standard plans catalog</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {plans.map((p) => (
                      <div key={p.id} className="bg-neutral-950 border border-neutral-900 p-5 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white">{p.name}</p>
                          <span className="text-xs font-bold text-purple-400 font-mono bg-purple-500/5 border border-purple-500/25 px-2 py-0.5 rounded">
                            {p.price} Cr / 15d
                          </span>
                        </div>
                        <ul className="text-xs text-neutral-400 space-y-1">
                          <li>Cores: {p.cpu} vCPU</li>
                          <li>Memory: {p.ram} MB</li>
                          <li>Storage: {p.storage} GB</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROMO CODES */}
          {activeTab === "promo" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add */}
                <div className="bg-neutral-900/20 border border-neutral-900 p-6 rounded-xl space-y-4 h-fit">
                  <h3 className="font-bold text-white text-base">Mint Promo Code</h3>
                  <form onSubmit={handleCreatePromo} className="space-y-4 text-sm">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Promo code string</label>
                      <input
                        type="text"
                        placeholder="MAGIC-7K9X-2PQA"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none uppercase font-mono focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Credit reward payout</label>
                      <input
                        type="number"
                        placeholder="500"
                        value={promoReward}
                        onChange={(e) => setPromoReward(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Maximum redemptions limit</label>
                      <input
                        type="number"
                        value={promoUses}
                        onChange={(e) => setPromoUses(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded p-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      Generate Code
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-base">Promo Code Catalog</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-mono font-bold text-white text-sm">WELCOME-NODE</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Reward: +1000 Credits</p>
                      </div>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded font-bold uppercase">
                        ACTIVE
                      </span>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-mono font-bold text-white text-sm">MAGIC-7K9X-2PQA</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Reward: +500 Credits</p>
                      </div>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded font-bold uppercase">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white">System Security Audit Logs</h1>
                <p className="text-neutral-400 text-sm mt-1">Review ledger transactions, node connectivity modifications, and user sign-ins.</p>
              </div>

              <div className="border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl">
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-neutral-950/40 border border-neutral-900/50 p-4 rounded-lg flex items-start gap-4 hover:border-neutral-850 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center text-purple-400 shrink-0 font-bold text-xs font-mono">
                        LOG
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{log.action}</p>
                          <span className="text-xs text-neutral-500 font-semibold font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{log.details}</p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-1">Executor: {log.userEmail || "SYSTEM_DAEMON"}</p>
                      </div>
                    </div>
                  ))}

                  {logs.length === 0 && (
                    <div className="text-center py-12 text-neutral-500 text-sm">
                      Audit journal is empty. Try creating actions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS (General Website Branding & Theme Customizer) */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-purple-400" /> Platform Settings & Branding
                </h1>
                <p className="text-neutral-400 text-sm mt-1">
                  Manage your website name, logo, taglines, and global dashboard theme.
                </p>
              </div>

              {/* Section 1: Website Name & Logo Branding */}
              <div className="border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-900 pb-4 gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Website Identity & Logo (Branding)</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Website ka naam aur logo change karein. Real-time updates all user sessions.
                    </p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl flex items-center gap-3 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Live Preview:</span>
                    <SiteLogo branding={siteBranding} size="sm" />
                  </div>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Website Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        Website Name (Website Ka Naam)
                      </label>
                      <input
                        type="text"
                        required
                        value={siteBranding.siteName}
                        onChange={(e) => setSiteBranding((prev) => ({ ...prev, siteName: e.target.value }))}
                        placeholder="e.g. MagicalNode"
                        className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-semibold"
                      />
                      <p className="text-[11px] text-neutral-500">
                        This name will be displayed across the header titles, login screen, and user portals.
                      </p>
                    </div>

                    {/* Website Tagline */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        Website Tagline / Subtitle
                      </label>
                      <input
                        type="text"
                        value={siteBranding.siteTagline}
                        onChange={(e) => setSiteBranding((prev) => ({ ...prev, siteTagline: e.target.value }))}
                        placeholder="e.g. VPS Platforms"
                        className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-semibold"
                      />
                      <p className="text-[11px] text-neutral-500">
                        Short text under the main website title (e.g., VPS Platforms).
                      </p>
                    </div>
                  </div>

                  {/* Logo Style Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                      Logo Type Selection
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSiteBranding((prev) => ({ ...prev, logoType: "icon" }))}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          siteBranding.logoType === "icon"
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-neutral-850 bg-neutral-950/60 text-neutral-400 hover:border-neutral-750"
                        }`}
                      >
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Blocks className="w-4 h-4 text-purple-400" /> Choose Preset Vector Icon Logo
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          Select from built-in high-performance server & cloud vector icons.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSiteBranding((prev) => ({ ...prev, logoType: "image" }))}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          siteBranding.logoType === "image"
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-neutral-850 bg-neutral-950/60 text-neutral-400 hover:border-neutral-750"
                        }`}
                      >
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-400" /> Custom Logo Image URL
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          Provide a direct link/URL to your custom PNG, SVG or WebP logo file.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Preset Icon Selector */}
                  {siteBranding.logoType === "icon" && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        Select Preset Icon
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
                        {Object.keys(ICON_MAP).map((iconKey) => {
                          const IconComp = ICON_MAP[iconKey];
                          const isSelected = siteBranding.logoIcon === iconKey;
                          return (
                            <button
                              key={iconKey}
                              type="button"
                              onClick={() => setSiteBranding((prev) => ({ ...prev, logoIcon: iconKey }))}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-purple-500 bg-purple-500/20 text-purple-300 shadow-md shadow-purple-500/10"
                                  : "border-neutral-850 bg-neutral-950 text-neutral-400 hover:border-neutral-750 hover:text-white"
                              }`}
                            >
                              <IconComp className="w-5 h-5" />
                              <span className="text-[10px] font-bold truncate max-w-full">{iconKey}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Logo Image URL Input */}
                  {siteBranding.logoType === "image" && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        Custom Logo Image URL
                      </label>
                      <input
                        type="url"
                        value={siteBranding.logoUrl}
                        onChange={(e) => setSiteBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      {siteBranding.logoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-850 rounded-lg text-xs text-neutral-400">
                          <span className="font-bold text-white">Image Preview:</span>
                          <img
                            src={siteBranding.logoUrl}
                            alt="Logo preview"
                            className="w-8 h-8 object-contain rounded bg-neutral-900 border border-neutral-800"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save Branding Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingBranding ? "Saving Settings..." : "Save Website Settings"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 2: Platform Theme Customizer */}
              <div className="border border-neutral-900 bg-neutral-900/10 p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="font-bold text-white text-base">Select Active Theme</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    The chosen theme will instantly synchronize system-wide across all user sessions and adapt the interactive node animated backgrounds.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { id: "purple", name: "Magical Purple", desc: "A deep black and cosmic purple theme.", class: "bg-purple-600 shadow-purple-900/50" },
                    { id: "indigo", name: "Indigo Network", desc: "A clean classic developer layout.", class: "bg-indigo-600 shadow-indigo-900/50" },
                    { id: "emerald", name: "Emerald Grid", desc: "High-performance environmental layout.", class: "bg-emerald-600 shadow-emerald-900/50" },
                    { id: "rose", name: "Rose Ruby", desc: "High intensity ruby developer canvas.", class: "bg-rose-600 shadow-rose-900/50" },
                    { id: "amber", name: "Amber Alert", desc: "Classic operational warn console.", class: "bg-amber-600 shadow-amber-900/50" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSaveTheme(t.id)}
                      disabled={isSavingTheme}
                      className={`relative flex flex-col justify-between text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        currentTheme === t.id
                          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                          : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-[11px] text-neutral-400 leading-normal">{t.desc}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between w-full">
                        <span className={`w-6 h-6 rounded-full ${t.class} shadow-inner`} />
                        {currentTheme === t.id && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
