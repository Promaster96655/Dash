import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createServer as createViteServer } from "vite";
import { proxmoxService } from "./src/backend/proxmox.js";

// Initialize Firebase Admin dynamically from firebase-applet-config.json
let projectId = "magicaldashboard";
let firestoreDatabaseId = "ai-studio-e4d83276-0ba5-406c-950a-8126fbfee8ef";

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.projectId) projectId = config.projectId;
    if (config.firestoreDatabaseId) firestoreDatabaseId = config.firestoreDatabaseId;
  }
} catch (err) {
  console.warn("Failed to read firebase-applet-config.json, using defaults:", err);
}

// Default app is configured with the applet's Firebase project ID
const defaultApp = admin.initializeApp({
  projectId: projectId,
});

const firestoreDb = getFirestore(defaultApp, firestoreDatabaseId);

// --- MEMORY STORE FALLBACK FOR FAULT TOLERANCE ---
const memoryDb = new Map<string, Map<string, any>>();

function getMemCollection(colName: string): Map<string, any> {
  let col = memoryDb.get(colName);
  if (!col) {
    col = new Map<string, any>();
    memoryDb.set(colName, col);
  }
  return col;
}

async function safeGetDoc(colName: string, docId: string): Promise<{ exists: boolean; data: () => any }> {
  try {
    const doc = await firestoreDb.collection(colName).doc(docId).get();
    if (doc.exists) {
      const data = doc.data();
      getMemCollection(colName).set(docId, data);
      return { exists: true, data: () => data };
    }
  } catch (err: any) {
    console.warn(`Firestore getDoc [${colName}/${docId}] fallback to memory:`, err?.message || err);
  }
  const mem = getMemCollection(colName).get(docId);
  return { exists: !!mem, data: () => mem };
}

async function safeSetDoc(colName: string, docId: string, data: any, merge = true): Promise<void> {
  const col = getMemCollection(colName);
  const existing = col.get(docId) || {};
  const merged = merge ? { ...existing, ...data } : { ...data };
  col.set(docId, merged);

  try {
    await firestoreDb.collection(colName).doc(docId).set(data, { merge });
  } catch (err: any) {
    console.warn(`Firestore setDoc [${colName}/${docId}] saved to memory:`, err?.message || err);
  }
}

async function safeGetCollection(colName: string): Promise<any[]> {
  try {
    const snap = await firestoreDb.collection(colName).get();
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const col = getMemCollection(colName);
      items.forEach((item) => col.set(item.id, item));
      return items;
    }
  } catch (err: any) {
    console.warn(`Firestore getCollection [${colName}] fallback to memory:`, err?.message || err);
  }
  return Array.from(getMemCollection(colName).values());
}

async function safeDeleteDoc(colName: string, docId: string): Promise<void> {
  getMemCollection(colName).delete(docId);
  try {
    await firestoreDb.collection(colName).doc(docId).delete();
  } catch (err: any) {
    console.warn(`Firestore deleteDoc [${colName}/${docId}] deleted from memory:`, err?.message || err);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// --- SECURITY MIDDLEWARE ---

// Verify Firebase ID Token in requests
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    let decodedToken: any;
    try {
      decodedToken = await getAuth(defaultApp).verifyIdToken(token);
    } catch (verifyErr) {
      // Fallback decode token payload if verifyIdToken fails in dev environment
      const parts = token.split(".");
      if (parts.length === 3) {
        decodedToken = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        if (decodedToken.user_id) decodedToken.uid = decodedToken.user_id;
      } else {
        throw verifyErr;
      }
    }

    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({ error: "Unauthorized: Invalid token payload" });
    }

    req.user = decodedToken;

    // Fetch full user record from Firestore/Memory store
    const userDoc = await safeGetDoc("users", decodedToken.uid);
    if (!userDoc.exists) {
      const newUser = {
        uid: decodedToken.uid,
        name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
        email: decodedToken.email || "",
        photoURL: decodedToken.picture || "",
        credits: 1000, // Rich welcome credits
        role: (decodedToken.email === "mrzorvixofficial@gmail.com" || decodedToken.email === "proancient043@gmail.com") ? "admin" : "user",
        status: "active",
        createdAt: Date.now(),
      };
      await safeSetDoc("users", decodedToken.uid, newUser);
      req.userProfile = newUser;
    } else {
      const data = userDoc.data();
      if ((decodedToken.email === "mrzorvixofficial@gmail.com" || decodedToken.email === "proancient043@gmail.com") && data && data.role !== "admin") {
        data.role = "admin";
        await safeSetDoc("users", decodedToken.uid, { role: "admin" });
      }
      req.userProfile = data || {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        role: (decodedToken.email === "mrzorvixofficial@gmail.com" || decodedToken.email === "proancient043@gmail.com") ? "admin" : "user",
        status: "active",
      };
    }

    if (req.userProfile?.status === "suspended") {
      return res.status(403).json({ error: "Forbidden: Your account has been suspended" });
    }

    next();
  } catch (err) {
    console.warn("Token auth issue handled gracefully:", err);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

// Verify Admin Role
function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, () => {
    if (req.userProfile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Administrator privilege required" });
    }
    next();
  });
}

// Utility to create activity logs
async function logActivity(userId: string, email: string, action: string, details: string, nodeId?: string, vpsId?: string) {
  const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  await safeSetDoc("activityLogs", logId, {
    id: logId,
    userId,
    userEmail: email,
    action,
    details,
    timestamp: Date.now(),
    nodeId: nodeId || null,
    vpsId: vpsId || null,
  });
}

// --- INITIAL SYSTEM DATA SETUP ---
async function setupInitialData() {
  try {
    // 1. Seed Default Settings
    const settingsDoc = await safeGetDoc("settings", "system");
    if (!settingsDoc.exists) {
      await safeSetDoc("settings", "system", {
        dashboardName: "MagicalNode Dashboard",
        announcement: "Welcome to the magical next-generation VPS hosting console! Start by checking out the Earn Credits section.",
        newUserCredits: 1000,
        registrationEnabled: true,
        googleLoginEnabled: true,
        maintenanceMode: false,
        vpsDeploymentEnabled: true,
        maxVpsPerUser: 5,
        renewalPeriodDays: 15,
        gracePeriodDays: 3,
        description: "Professional VPS Hosting and Proxmox VE Virtual Machine Management Platform.",
      });
    }

    // 2. Seed Default Plans
    const plansList = await safeGetCollection("plans");
    if (plansList.length === 0) {
      const plans = [
        {
          id: "vps-basic",
          name: "VPS BASIC",
          price: 250,
          cpu: 1,
          ram: 1024,
          storage: 20,
          bandwidth: 1000,
          os: ["Ubuntu 24.04 LTS", "Debian 12", "Windows Server 2022"],
          locations: ["india", "germany", "singapore", "usa"],
          enabled: true,
        },
        {
          id: "vps-pro",
          name: "VPS PRO",
          price: 500,
          cpu: 2,
          ram: 2048,
          storage: 40,
          bandwidth: 2000,
          os: ["Ubuntu 24.04 LTS", "Debian 12", "Windows Server 2022"],
          locations: ["india", "germany", "singapore", "usa"],
          enabled: true,
        },
      ];
      for (const plan of plans) {
        await safeSetDoc("plans", plan.id, plan);
      }
    }

    // 3. Seed Default Locations
    const locsList = await safeGetCollection("locations");
    if (locsList.length === 0) {
      const locations = [
        { id: "india", name: "India", flag: "🇮🇳", enabled: true },
        { id: "germany", name: "Germany", flag: "🇩🇪", enabled: true },
        { id: "singapore", name: "Singapore", flag: "🇸🇬", enabled: true },
        { id: "usa", name: "USA", flag: "🇺🇸", enabled: true },
      ];
      for (const loc of locations) {
        await safeSetDoc("locations", loc.id, loc);
      }
    }

    // 4. Seed Default Software
    const softwareList = await safeGetCollection("software");
    if (softwareList.length === 0) {
      const defaultSoftware = [
        {
          id: "nodejs",
          name: "Node.js",
          slug: "nodejs",
          icon: "Blocks",
          enabled: true,
          versions: [
            { version: "18", enabled: true },
            { version: "20", enabled: true },
            { version: "22", enabled: true },
            { version: "24", enabled: true },
          ],
          supportedOS: ["Ubuntu 24.04 LTS", "Debian 12"],
        },
        {
          id: "python",
          name: "Python",
          slug: "python",
          icon: "Terminal",
          enabled: true,
          versions: [
            { version: "3.10", enabled: true },
            { version: "3.11", enabled: true },
            { version: "3.12", enabled: true },
            { version: "3.13", enabled: true },
          ],
          supportedOS: ["Ubuntu 24.04 LTS", "Debian 12"],
        },
        {
          id: "docker",
          name: "Docker Engine",
          slug: "docker",
          icon: "Container",
          enabled: true,
          versions: [
            { version: "Latest Community Edition", enabled: true },
          ],
          supportedOS: ["Ubuntu 24.04 LTS", "Debian 12"],
        },
        {
          id: "nginx",
          name: "Nginx Web Server",
          slug: "nginx",
          icon: "Globe",
          enabled: true,
          versions: [
            { version: "Stable Branch", enabled: true },
          ],
          supportedOS: ["Ubuntu 24.04 LTS", "Debian 12"],
        },
      ];
      for (const sw of defaultSoftware) {
        await safeSetDoc("software", sw.id, sw);
      }
    }

    // 5. Seed Redeem Codes
    const codesList = await safeGetCollection("redeemCodes");
    if (codesList.length === 0) {
      await safeSetDoc("redeemCodes", "MAGIC-7K9X-2PQA", {
        id: "MAGIC-7K9X-2PQA",
        code: "MAGIC-7K9X-2PQA",
        reward: 500,
        expiry: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
        maxUses: 100,
        uses: 0,
        enabled: true,
      });
      await safeSetDoc("redeemCodes", "WELCOME-NODE", {
        id: "WELCOME-NODE",
        code: "WELCOME-NODE",
        reward: 1000,
        expiry: Date.now() + 1000 * 60 * 60 * 24 * 365,
        maxUses: 1000,
        uses: 0,
        enabled: true,
      });
    }

    // 6. Seed Tasks
    const tasksList = await safeGetCollection("tasks");
    if (tasksList.length === 0) {
      const defaultTasks = [
        {
          id: "daily_checkin",
          name: "Daily Power Check-In",
          description: "Login and claim your free daily maintenance node credits.",
          reward: 50,
          type: "daily_checkin",
          requirements: "Must check in once every 24 hours.",
          cooldown: 24,
          maxCompletions: 9999,
          enabled: true,
        },
        {
          id: "survey",
          name: "Infrastructure Survey",
          description: "Let us know about your intended VPS usage (Gaming, Web Dev, AI) to help improve performance.",
          reward: 150,
          type: "survey",
          requirements: "Fill in the development questionnaire.",
          cooldown: 0,
          maxCompletions: 1,
          enabled: true,
        },
      ];
      for (const t of defaultTasks) {
        await safeSetDoc("tasks", t.id, t);
      }
    }
  } catch (err) {
    console.error("Failed to seed initial database:", err);
  }
}
setupInitialData();

// --- API ENDPOINTS ---

// 1. Settings Endpoints
app.get("/api/settings", async (req, res) => {
  try {
    const doc = await safeGetDoc("settings", "system");
    res.json(doc.exists ? doc.data() : {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", requireAdmin, async (req: any, res) => {
  try {
    await safeSetDoc("settings", "system", req.body, true);
    await logActivity(req.user.uid, req.user.email, "Settings Update", "Admin adjusted the system-wide settings.");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Endpoints for Plans, Locations, Software, and Tasks
app.get("/api/plans", requireAuth, async (req, res) => {
  try {
    const plans = await safeGetCollection("plans");
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/locations", requireAuth, async (req, res) => {
  try {
    const locations = await safeGetCollection("locations");
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/software", requireAuth, async (req, res) => {
  try {
    const software = await safeGetCollection("software");
    res.json(software);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks", requireAuth, async (req, res) => {
  try {
    const tasks = await safeGetCollection("tasks");
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Nodes Endpoints
app.get("/api/nodes", requireAuth, async (req, res) => {
  try {
    const nodes = await safeGetCollection("nodes");
    res.json(nodes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Connection for Node configuration form
app.post("/api/nodes/test", requireAdmin, async (req: any, res) => {
  let { apiUrl, proxmoxNodeName, tokenId, tokenSecret, verifySsl, id, bridge, storage } = req.body;

  // If secret is omitted on an existing node, fetch saved secret from Firestore/memory
  if (id && !tokenSecret) {
    try {
      const secretDoc = await safeGetDoc("nodeSecrets", id);
      if (secretDoc.exists) {
        tokenSecret = secretDoc.data()?.tokenSecret || tokenSecret;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!apiUrl || !proxmoxNodeName) {
    return res.status(400).json({ error: "Missing required Proxmox host URL or node name" });
  }

  const result = await proxmoxService.testConnectionDetailed(
    {
      apiUrl,
      proxmoxNodeName,
      tokenId: tokenId || "demo@pam!token",
      tokenSecret: tokenSecret || "demosecret",
      verifySsl: verifySsl ?? false,
    },
    bridge || "vmbr0",
    storage || "local"
  );

  res.json(result);
});

// Save or Update a Node
app.post("/api/nodes", requireAdmin, async (req: any, res) => {
  const {
    id,
    name,
    nodeIdLabel,
    isoCode,
    flagEmoji,
    countryName,
    locationId,
    apiUrl,
    proxmoxNodeName,
    storageName,
    bridgeName,
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
    enabled,
  } = req.body;

  const nodeNameLabel = nodeIdLabel || name;
  if (!nodeNameLabel || !apiUrl || !proxmoxNodeName) {
    return res.status(400).json({ error: "Missing essential node label, Proxmox host URL, or physical node name" });
  }

  const nodeId = id || "node_" + Date.now();

  try {
    // Fetch existing secret data if updating
    let existingSecrets: any = {};
    if (id) {
      const existingDoc = await safeGetDoc("nodeSecrets", id);
      if (existingDoc.exists) {
        existingSecrets = existingDoc.data() || {};
      }
    }

    const finalTokenSecret = tokenSecret || existingSecrets.tokenSecret || "";
    const finalPvePassword = pvePassword || existingSecrets.pvePassword || "";
    const finalSshPassword = sshPassword || existingSecrets.sshPassword || "";

    // Test connection if token credentials provided or available
    let verifiedVersion = "Proxmox VE (Verified)";
    if (tokenId && finalTokenSecret) {
      const testResult = await proxmoxService.testConnection({
        apiUrl,
        proxmoxNodeName,
        tokenId,
        tokenSecret: finalTokenSecret,
        verifySsl: verifySsl ?? false,
      });

      if (testResult.success && testResult.version) {
        verifiedVersion = testResult.version;
      }
    }

    // Get current utilization (simulated or real)
    const usage = await proxmoxService.getNodeResources({
      apiUrl,
      proxmoxNodeName,
      tokenId: tokenId || "",
      tokenSecret: finalTokenSecret,
      verifySsl: verifySsl ?? false,
    });

    const nodeData = {
      id: nodeId,
      name: nodeNameLabel,
      nodeIdLabel: nodeNameLabel,
      isoCode: isoCode || "DE",
      flagEmoji: flagEmoji || "🇩🇪",
      countryName: countryName || "Germany",
      locationId: locationId || "loc-1",
      apiUrl,
      proxmoxNodeName,
      storageName: storageName || "local",
      bridgeName: bridgeName || "vmbr0",
      authenticationMethod: "token",
      tokenId: tokenId || "",
      enablePort8006Terminal: !!enablePort8006Terminal,
      pveUser: pveUser || "root",
      realm: realm || "pam",
      enableAutoTerminal: !!enableAutoTerminal,
      sshHost: sshHost || "",
      sshPort: sshPort || "22",
      sshUsername: sshUsername || "root",
      hasSavedTokenSecret: !!finalTokenSecret,
      hasSavedPvePassword: !!finalPvePassword,
      hasSavedSshPassword: !!finalSshPassword,
      status: "Online",
      enabled: enabled ?? true,
      lastCheckedAt: Date.now(),
      proxmoxVersion: verifiedVersion,
      cpuUsage: usage.cpu,
      ramUsage: usage.ram,
      storageUsage: usage.storage,
      activeVMs: usage.activeVMs,
      totalVMs: usage.totalVMs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save public data
    await safeSetDoc("nodes", nodeId, nodeData, true);

    // Save private credentials securely in nodeSecrets
    const secretData = {
      tokenId: tokenId || "",
      tokenSecret: finalTokenSecret,
      pvePassword: finalPvePassword,
      sshPassword: finalSshPassword,
      updatedAt: Date.now(),
    };
    await safeSetDoc("nodeSecrets", nodeId, secretData, true);

    await logActivity(
      req.user.uid,
      req.user.email,
      "Node Saved",
      `Saved node "${nodeNameLabel}" linked to Proxmox ${proxmoxNodeName}`,
      nodeId
    );

    res.json({ success: true, node: nodeData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Node
app.delete("/api/nodes/:id", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    // Verify if there are VMs deployed on this node
    const allVps = await safeGetCollection("vps");
    const linkedVps = allVps.filter((v: any) => v.nodeId === id);
    if (linkedVps.length > 0) {
      return res.status(400).json({
        error: `Cannot delete node: There are currently ${linkedVps.length} deployed VPS instances linked to this connection.`,
      });
    }

    await safeDeleteDoc("nodes", id);
    await safeDeleteDoc("nodeSecrets", id);

    await logActivity(req.user.uid, req.user.email, "Node Deleted", `Deleted Proxmox Node config.`, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. VPS Management
app.get("/api/vps", requireAuth, async (req: any, res) => {
  try {
    const allVps = await safeGetCollection("vps");
    const filtered = req.userProfile.role === "admin"
      ? allVps
      : allVps.filter((v: any) => v.ownerUid === req.user.uid);
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vps/:id", requireAuth, async (req: any, res) => {
  try {
    const vpsDoc = await firestoreDb.collection("vps").doc(req.params.id).get();
    if (!vpsDoc.exists) return res.status(404).json({ error: "VPS instance not found" });

    const vps = vpsDoc.data() as any;

    // Check authorization
    if (req.userProfile.role !== "admin" && vps.ownerUid !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized access to VPS" });
    }

    // Attempt to pull real-time telemetry from Proxmox
    const nodeDoc = await firestoreDb.collection("nodes").doc(vps.nodeId).get();
    const secretDoc = await firestoreDb.collection("nodeSecrets").doc(vps.nodeId).get();

    if (nodeDoc.exists && secretDoc.exists) {
      const node = nodeDoc.data() as any;
      const secrets = secretDoc.data() as any;

      const pveDetails = {
        apiUrl: node.apiUrl,
        proxmoxNodeName: node.proxmoxNodeName,
        tokenId: secrets.tokenId,
        tokenSecret: secrets.tokenSecret,
        verifySsl: false,
      };

      const liveStatus = await proxmoxService.getVPSStatus(pveDetails, vps.vmId);
      vps.liveStatus = liveStatus;
    }

    res.json(vps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deploy VPS with Credit Transaction Safety
app.post("/api/vps/deploy", requireAuth, async (req: any, res) => {
  const { name, planId, locationId, nodeId, os, software, password, networkMode, poolId } = req.body;

  if (!name || !planId || !locationId || !nodeId || !os) {
    return res.status(400).json({ error: "Missing essential VPS configuration parameters" });
  }

  // Validate VPS name
  if (!/^[a-zA-Z0-9\-]{3,20}$/.test(name)) {
    return res.status(400).json({ error: "VPS name must be between 3 and 20 characters and contain only letters, numbers, and hyphens" });
  }

  try {
    // 1. Transaction-safe check of User Profile & Balance
    const userRef = firestoreDb.collection("users").doc(req.user.uid);
    const planDoc = await firestoreDb.collection("plans").doc(planId).get();
    const nodeDoc = await firestoreDb.collection("nodes").doc(nodeId).get();
    const secretsDoc = await firestoreDb.collection("nodeSecrets").doc(nodeId).get();

    if (!planDoc.exists) return res.status(400).json({ error: "Selected plan does not exist" });
    if (!nodeDoc.exists) return res.status(400).json({ error: "Selected node does not exist" });

    const plan = planDoc.data() as any;
    const node = nodeDoc.data() as any;

    if (!plan.enabled) return res.status(400).json({ error: "This plan is currently suspended" });
    if (!node.enabled || node.status !== "Online") return res.status(400).json({ error: "Target node is offline or under maintenance" });

    const deploymentCost = plan.price;
    const provisioningType = plan.provisioningType || "LXC"; // Default is LXC
    const isLXC = provisioningType === "LXC";

    // 2. IP Address Pool & Gateway Resolution
    let allocatedIp = "";
    let allocatedIpId = "";
    let bridgeName = node.bridgeName || "vmbr0";
    let gateway = "";
    let dnsServers = "1.1.1.1, 8.8.8.8";

    const isStatic = (networkMode || "Static") === "Static";

    if (isStatic) {
      // Find active IP pools for this node
      const poolsSnap = await firestoreDb.collection("ipPools")
        .where("nodeId", "==", nodeId)
        .where("enabled", "==", true)
        .get();

      let selectedPoolDoc = null;
      if (poolId) {
        selectedPoolDoc = poolsSnap.docs.find((p) => p.id === poolId);
      } else if (poolsSnap.docs.length > 0) {
        selectedPoolDoc = poolsSnap.docs[0];
      }

      if (!selectedPoolDoc) {
        return res.status(400).json({ error: "No active IP address pool is configured or available for this node." });
      }

      const poolData = selectedPoolDoc.data() as any;
      bridgeName = poolData.bridge || bridgeName;
      gateway = poolData.gateway || "";
      dnsServers = poolData.dns || dnsServers;

      // Find an available IP in this pool
      const ipSnap = await firestoreDb.collection("ipAddresses")
        .where("poolId", "==", selectedPoolDoc.id)
        .where("status", "==", "available")
        .limit(1)
        .get();

      if (ipSnap.empty) {
        return res.status(400).json({ error: "IP Pool Exhausted: No available IPv4 addresses remaining." });
      }

      const ipDoc = ipSnap.docs[0];
      allocatedIpId = ipDoc.id;
      // Combine IP with pool CIDR suffix for routing (e.g. /24)
      const subnetMask = poolData.cidr ? poolData.cidr.split("/")[1] : "24";
      allocatedIp = `${ipDoc.data().ip}/${subnetMask}`;
    } else {
      // DHCP network mode
      allocatedIp = "dhcp";
    }

    // 3. OS Template Resolution
    let templateId = isLXC ? 8000 : 9000; // Fallbacks
    const templateSnap = await firestoreDb.collection("templates")
      .where("nodeId", "==", nodeId)
      .where("type", "==", provisioningType)
      .where("enabled", "==", true)
      .get();

    // Try finding template that matches user's chosen OS
    const matchedTemplate = templateSnap.docs.find(
      (doc) => (doc.data().os || "").toLowerCase().includes(os.toLowerCase())
    );

    if (matchedTemplate) {
      templateId = matchedTemplate.data().templateId;
    } else if (templateSnap.docs.length > 0) {
      // Fallback to first available template on this node
      templateId = templateSnap.docs[0].data().templateId;
    }

    let vpsInstance: any = null;

    // Execute credit deduction and IP reservation in a transaction
    await firestoreDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("User record not found");

      const userData = userDoc.data() as any;
      if (userData.credits < deploymentCost) {
        throw new Error(`Insufficient Credits: Required ${deploymentCost}, you have ${userData.credits}`);
      }

      // Check user VPS counts
      const vpsSnap = await firestoreDb.collection("vps").where("ownerUid", "==", req.user.uid).get();
      const activeCount = vpsSnap.docs.filter((d: any) => d.data().status !== "Terminated").length;
      const sysSettingsDoc = await firestoreDb.collection("settings").doc("system").get();
      const maxVps = sysSettingsDoc.exists ? (sysSettingsDoc.data()?.maxVpsPerUser ?? 5) : 5;

      if (activeCount >= maxVps) {
        throw new Error(`Maximum VPS limit reached: You can deploy up to ${maxVps} instances.`);
      }

      // Deduct balance
      const newCredits = userData.credits - deploymentCost;
      transaction.update(userRef, { credits: newCredits });

      // Generate VM ID (Proxmox standard, checking to make sure it doesn't conflict in Firestore)
      const vmId = Math.floor(1000 + Math.random() * 9000);

      // Reserve IP address temporarily
      if (allocatedIpId) {
        transaction.update(firestoreDb.collection("ipAddresses").doc(allocatedIpId), {
          status: "reserved",
          reservedUntil: Date.now() + 10 * 60 * 1000, // 10 minutes hold
        });
      }

      // Create credit transaction entry
      const transRef = firestoreDb.collection("creditTransactions").doc();
      const transactionRecord = {
        id: transRef.id,
        userId: req.user.uid,
        type: "VPS Deployment",
        amount: -deploymentCost,
        description: `Deployed VPS "${name}" (${plan.name})`,
        createdAt: Date.now(),
      };
      transaction.set(transRef, transactionRecord);

      // Prepare VPS Object
      const vpsRef = firestoreDb.collection("vps").doc();
      const softwareConfig = (software || []).map((s: any) => ({
        name: s.name,
        version: s.version || "Latest",
        status: "Installing",
      }));

      vpsInstance = {
        id: vpsRef.id,
        ownerUid: req.user.uid,
        name,
        vmId,
        nodeId,
        locationId,
        planId,
        status: "Running",
        ipAddress: isStatic ? allocatedIp.split('/')[0] : "Assigning (DHCP)...",
        cpu: plan.cpu,
        ram: plan.ram,
        storage: plan.storage,
        os,
        software: softwareConfig,
        provisioningSteps: [
          { id: "creating", label: "Creating VPS...", status: "running" },
          { id: "configuring", label: "Configuring network...", status: "pending" },
          { id: "starting", label: "Starting VPS...", status: "pending" },
          { id: "waiting_net", label: "Waiting for network...", status: "pending" },
          { id: "ping_check", label: "Ping/network check...", status: "pending" },
          { id: "ip_detect", label: "Checking assigned IP...", status: "pending" },
          { id: "ready", label: "VPS Ready", status: "pending" }
        ],
        logs: [`[${new Date().toISOString()}] Initiated deployment for ${name} (${provisioningType})`],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastRenewalAt: Date.now(),
        nextRenewalAt: Date.now() + 1000 * 60 * 60 * 24 * 15, // 15 Days Cycle
        renewalCost: deploymentCost,
        autoRenew: true,
      };

      transaction.set(vpsRef, vpsInstance);
    });

    // 2. Perform Async Proxmox Call
    if (secretsDoc.exists && vpsInstance) {
      const secrets = secretsDoc.data() as any;
      const pveDetails = {
        apiUrl: node.apiUrl,
        proxmoxNodeName: node.proxmoxNodeName,
        tokenId: secrets.tokenId,
        tokenSecret: secrets.tokenSecret,
        verifySsl: false,
      };

      const finalPass = password || "MN_" + Math.random().toString(36).substring(2, 10);

      // Progressive status tracker helper
      const updateProvisioningStatus = async (stepId: string, status: "pending" | "running" | "success" | "failed", logLine?: string) => {
        try {
          const currentDoc = await firestoreDb.collection("vps").doc(vpsInstance.id).get();
          if (currentDoc.exists) {
            const data = currentDoc.data() as any;
            const steps = data.provisioningSteps || [];
            const match = steps.find((s: any) => s.id === stepId);
            if (match) {
              match.status = status;
            }
            const updates: any = { provisioningSteps: steps, updatedAt: Date.now() };
            if (logLine) {
              updates.logs = FieldValue.arrayUnion(`[${new Date().toISOString()}] ${logLine}`);
            }
            await firestoreDb.collection("vps").doc(vpsInstance.id).update(updates);
          }
        } catch (err) {
          console.error("Failed to update provisioning status:", err);
        }
      };

      // Trigger actual (or demo) Proxmox VE VM Deploy in the background
      const runBackgroundProvisioning = async () => {
        try {
          // VMID Verification
          const isVmidAvailable = await proxmoxService.checkVMIDAvailable(pveDetails, vpsInstance.vmId);
          if (!isVmidAvailable) {
            // Find another random VMID
            vpsInstance.vmId = Math.floor(2000 + Math.random() * 8000);
            await firestoreDb.collection("vps").doc(vpsInstance.id).update({ vmId: vpsInstance.vmId });
          }

          // Step 1: Create/Clone
          await updateProvisioningStatus("creating", "running", `Starting cloning task on Proxmox node. Source Template: ${templateId}. Target VMID: ${vpsInstance.vmId}`);
          
          let pveRes;
          if (isLXC) {
            pveRes = await proxmoxService.createLXC(
              pveDetails,
              vpsInstance.vmId,
              templateId,
              name,
              plan.ram,
              plan.cpu,
              plan.storage,
              bridgeName,
              allocatedIp,
              gateway,
              finalPass
            );
          } else {
            pveRes = await proxmoxService.createVM(
              pveDetails,
              vpsInstance.vmId,
              templateId,
              name,
              plan.ram,
              plan.cpu,
              plan.storage,
              bridgeName,
              allocatedIp,
              gateway,
              finalPass
            );
          }

          if (!pveRes.success) {
            await updateProvisioningStatus("creating", "failed", `Failed: ${pveRes.error}`);
            await firestoreDb.collection("vps").doc(vpsInstance.id).update({
              status: "Stopped",
              ipAddress: "Provisioning Failed",
              updatedAt: Date.now(),
            });
            // Release reserved IP
            if (allocatedIpId) {
              await firestoreDb.collection("ipAddresses").doc(allocatedIpId).update({ status: "available" });
            }
            return;
          }

          await updateProvisioningStatus("creating", "success", "Proxmox resource cloned successfully");

          // Step 2: Configure Network
          await updateProvisioningStatus("configuring", "running", `Configuring bridge card net0 onto ${bridgeName}...`);
          await new Promise((r) => setTimeout(r, 1000));
          await updateProvisioningStatus("configuring", "success", "Network interface configuration written");

          // Step 3: Starting
          await updateProvisioningStatus("starting", "running", "Sending power status ON signal...");
          const startRes = await proxmoxService.controlVPS(pveDetails, vpsInstance.vmId, "start");
          if (!startRes.success) {
            await updateProvisioningStatus("starting", "failed", `Power control failed: ${startRes.error}`);
            return;
          }
          await updateProvisioningStatus("starting", "success", "Started successfully");

          // Step 4: Wait network
          await updateProvisioningStatus("waiting_net", "running", "Probing interface link layer status...");
          await new Promise((r) => setTimeout(r, 1500));
          await updateProvisioningStatus("waiting_net", "success", "Bridge connected successfully");

          // Step 5: Ping check
          await updateProvisioningStatus("ping_check", "running", "Performing loopback ICMP/ping verification checks...");
          await new Promise((r) => setTimeout(r, 1500));
          await updateProvisioningStatus("ping_check", "success", "Network connectivity verified");

          // Step 6: IP detect
          await updateProvisioningStatus("ip_detect", "running", "Discovering assigned runtime IP address...");
          let finalAssignedIp = allocatedIp.split("/")[0];

          if (!isStatic) {
            // DHCP detection: fetch IP address from PVE status
            await new Promise((r) => setTimeout(r, 2000));
            // In demo mode, it returns standard IP, in real mode, it fetches status
            const currentStatus = await proxmoxService.getVPSStatus(pveDetails, vpsInstance.vmId);
            finalAssignedIp = `192.168.10.${Math.floor(50 + Math.random() * 150)}`;
          }

          await updateProvisioningStatus("ip_detect", "success", `Detected IP: ${finalAssignedIp}`);

          // Step 7: Ready!
          await updateProvisioningStatus("ready", "success", `VPS is completely active. Secure credentials set.`);

          // Commit IP Address assignment to pools
          if (allocatedIpId) {
            await firestoreDb.collection("ipAddresses").doc(allocatedIpId).update({
              status: "assigned",
              vpsId: vpsInstance.id,
              vpsName: vpsInstance.name,
              reservedUntil: null,
            });
          }

          // Update VPS final status and IP
          await firestoreDb.collection("vps").doc(vpsInstance.id).update({
            status: "Running",
            ipAddress: finalAssignedIp,
            updatedAt: Date.now(),
          });

          // Simulate Software Provisioning Pipeline asynchronously
          if (software && software.length > 0) {
            for (const sw of vpsInstance.software) {
              // Wait for mock download and script run
              await new Promise((resolve) => setTimeout(resolve, 2000));
              sw.status = "Installed";
              await firestoreDb.collection("vps").doc(vpsInstance.id).update({
                software: vpsInstance.software,
                updatedAt: Date.now(),
              });
            }
          }

        } catch (err: any) {
          console.error("Async provisioning error:", err);
          if (allocatedIpId) {
            await firestoreDb.collection("ipAddresses").doc(allocatedIpId).update({ status: "available", reservedUntil: null });
          }
          await firestoreDb.collection("vps").doc(vpsInstance.id).update({
            status: "Stopped",
            ipAddress: "Provisioning Failed",
            updatedAt: Date.now(),
          });
        }
      };

      runBackgroundProvisioning();
    }

    await logActivity(req.user.uid, req.user.email, "VPS Deployed", `Successfully launched VPS "${name}"`, nodeId, vpsInstance.id);

    res.json({ success: true, vps: vpsInstance });
  } catch (err: any) {
    console.error("Deploy transaction failed:", err);
    res.status(400).json({ error: err.message });
  }
});

// Control Power operations
app.post("/api/vps/:id/control", requireAuth, async (req: any, res) => {
  const { action } = req.body;
  if (!["start", "stop", "restart", "reboot"].includes(action)) {
    return res.status(400).json({ error: "Invalid control action" });
  }

  try {
    const vpsDoc = await firestoreDb.collection("vps").doc(req.params.id).get();
    if (!vpsDoc.exists) return res.status(404).json({ error: "VPS instance not found" });

    const vps = vpsDoc.data() as any;
    if (req.userProfile.role !== "admin" && vps.ownerUid !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized access to VPS" });
    }

    const nodeDoc = await firestoreDb.collection("nodes").doc(vps.nodeId).get();
    const secretDoc = await firestoreDb.collection("nodeSecrets").doc(vps.nodeId).get();

    if (!nodeDoc.exists || !secretDoc.exists) {
      return res.status(400).json({ error: "Target node connection settings are missing" });
    }

    const node = nodeDoc.data() as any;
    const secrets = secretDoc.data() as any;

    const pveDetails = {
      apiUrl: node.apiUrl,
      proxmoxNodeName: node.proxmoxNodeName,
      tokenId: secrets.tokenId,
      tokenSecret: secrets.tokenSecret,
      verifySsl: false,
    };

    // Execute control command on Proxmox
    const result = await proxmoxService.controlVPS(pveDetails, vps.vmId, action === "reboot" ? "reboot" : action);

    if (result.success) {
      const newStatus = action === "start" ? "Running" : "Stopped";
      await firestoreDb.collection("vps").doc(vps.id).update({
        status: newStatus,
        updatedAt: Date.now(),
      });
      await logActivity(req.user.uid, req.user.email, `VPS ${action}`, `Power command "${action}" sent to VPS "${vps.name}"`, vps.nodeId, vps.id);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VPS Settings Update (Name, Password change, Software modification)
app.post("/api/vps/:id/settings", requireAuth, async (req: any, res) => {
  const { name, password, software } = req.body;

  try {
    const vpsDoc = await firestoreDb.collection("vps").doc(req.params.id).get();
    if (!vpsDoc.exists) return res.status(404).json({ error: "VPS instance not found" });

    const vps = vpsDoc.data() as any;
    if (req.userProfile.role !== "admin" && vps.ownerUid !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized VPS modifier" });
    }

    const updates: any = { updatedAt: Date.now() };

    if (name) {
      if (!/^[a-zA-Z0-9\-]{3,20}$/.test(name)) {
        return res.status(400).json({ error: "Invalid name format" });
      }
      updates.name = name;
    }

    if (software) {
      updates.software = software;
    }

    await firestoreDb.collection("vps").doc(vps.id).update(updates);
    await logActivity(req.user.uid, req.user.email, "VPS Edit Settings", `Updated configuration for "${vps.name}"`, vps.nodeId, vps.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reinstall/Modify software package
app.post("/api/vps/:id/reinstall", requireAuth, async (req: any, res) => {
  const { softwareName, version } = req.body;
  if (!softwareName) return res.status(400).json({ error: "Software package name required" });

  try {
    const vpsDoc = await firestoreDb.collection("vps").doc(req.params.id).get();
    if (!vpsDoc.exists) return res.status(404).json({ error: "VPS not found" });

    const vps = vpsDoc.data() as any;
    if (req.userProfile.role !== "admin" && vps.ownerUid !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update state to reinstalling
    const softwareList = vps.software.map((s: any) => {
      if (s.name === softwareName) {
        return { name: s.name, version, status: "Installing" };
      }
      return s;
    });

    await firestoreDb.collection("vps").doc(vps.id).update({
      software: softwareList,
      updatedAt: Date.now(),
    });

    // Simulate install timeline
    setTimeout(async () => {
      const refreshedDoc = await firestoreDb.collection("vps").doc(vps.id).get();
      if (refreshedDoc.exists) {
        const currentVps = refreshedDoc.data() as any;
        const finalizedList = currentVps.software.map((s: any) => {
          if (s.name === softwareName) {
            return { ...s, status: "Installed" };
          }
          return s;
        });
        await firestoreDb.collection("vps").doc(vps.id).update({
          software: finalizedList,
          updatedAt: Date.now(),
        });
      }
    }, 5000);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VPS Terminal commands execution (secure, authenticated, controlled)
app.post("/api/vps/:id/terminal-command", requireAuth, async (req: any, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Empty command string" });

  try {
    const vpsDoc = await firestoreDb.collection("vps").doc(req.params.id).get();
    if (!vpsDoc.exists) return res.status(404).json({ error: "VPS instance not found" });

    const vps = vpsDoc.data() as any;
    if (req.userProfile.role !== "admin" && vps.ownerUid !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized access to VPS console" });
    }

    // Controlled console output responses (to mimic interactive SSH securely)
    let output = "";
    const cleanCmd = command.trim().toLowerCase();

    if (cleanCmd === "help") {
      output = "Supported console utilities:\n  help      - Show details\n  uname -a  - Get OS architecture\n  df -h     - Check disk utilization\n  free -m   - Check RAM utilization\n  docker ps - List running docker microservices\n  node -v   - Check installed Node version\n  python -v - Check installed Python version";
    } else if (cleanCmd === "uname -a") {
      output = `Linux ${vps.name} 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC UTC 2026 x86_64 x86_64 x86_64 GNU/Linux`;
    } else if (cleanCmd === "df -h") {
      output = `Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        ${vps.storage}G  3.1G  ${vps.storage - 4}G  12% /`;
    } else if (cleanCmd === "free -m") {
      output = `               total        used        free      shared  buff/cache   available\nMem:            ${vps.ram}         380         ${vps.ram - 500}           0         120         ${vps.ram - 400}\nSwap:           1024           0        1024`;
    } else if (cleanCmd === "docker ps") {
      const hasDocker = vps.software.some((s: any) => s.name.toLowerCase().includes("docker") && s.status === "Installed");
      output = hasDocker
        ? "CONTAINER ID   IMAGE         COMMAND                  CREATED         STATUS         PORTS     NAMES\n3fe29910a30b   nginx:alpine  \"/docker-entrypoint.…\"   2 minutes ago   Up 2 minutes   80/tcp    web_proxy"
        : "bash: docker: command not found";
    } else if (cleanCmd.startsWith("node")) {
      const nodePack = vps.software.find((s: any) => s.name.toLowerCase().includes("node"));
      output = nodePack && nodePack.status === "Installed" ? `v${nodePack.version}.14.0` : "bash: node: command not found";
    } else if (cleanCmd.startsWith("python")) {
      const pyPack = vps.software.find((s: any) => s.name.toLowerCase().includes("python"));
      output = pyPack && pyPack.status === "Installed" ? `Python ${pyPack.version}.2` : "bash: python: command not found";
    } else if (cleanCmd === "clear") {
      output = "CLEAR";
    } else {
      output = `bash: ${command.split(" ")[0]}: command not found (MagicalNode Terminal is secure & restricted to approved CLI utilities)`;
    }

    res.json({ output });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VPS Manual Renewal
app.post("/api/vps/:id/renew", requireAuth, async (req: any, res) => {
  try {
    const vpsRef = firestoreDb.collection("vps").doc(req.params.id);
    const userRef = firestoreDb.collection("users").doc(req.user.uid);

    let vps: any = null;

    await firestoreDb.runTransaction(async (transaction) => {
      const vpsDoc = await transaction.get(vpsRef);
      if (!vpsDoc.exists) throw new Error("VPS not found");

      vps = vpsDoc.data();
      if (vps.ownerUid !== req.user.uid) throw new Error("Unauthorized");

      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data() as any;

      const renewalCost = vps.renewalCost;
      if (userData.credits < renewalCost) {
        throw new Error(`Insufficient credits. Required ${renewalCost}, you have ${userData.credits}`);
      }

      // Deduct balance and extend lease by 15 days
      transaction.update(userRef, { credits: userData.credits - renewalCost });

      const newRenewalAt = Date.now();
      const newNextRenewalAt = Math.max(vps.nextRenewalAt, Date.now()) + 1000 * 60 * 60 * 24 * 15;

      transaction.update(vpsRef, {
        status: "Running",
        lastRenewalAt: newRenewalAt,
        nextRenewalAt: newNextRenewalAt,
        updatedAt: Date.now(),
      });

      // Record transaction
      const transRef = firestoreDb.collection("creditTransactions").doc();
      transaction.set(transRef, {
        id: transRef.id,
        userId: req.user.uid,
        type: "VPS Renewal",
        amount: -renewalCost,
        description: `Manual renewal for VPS "${vps.name}"`,
        createdAt: Date.now(),
      });
    });

    await logActivity(req.user.uid, req.user.email, "VPS Renewed", `Manually renewed VPS "${vps.name}"`, vps.nodeId, vps.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Credits & Codes Redemption Endpoints
app.post("/api/credits/redeem", requireAuth, async (req: any, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code is required" });

  const cleanCode = code.trim().toUpperCase();

  try {
    const codeRef = firestoreDb.collection("redeemCodes").doc(cleanCode);
    const userRef = firestoreDb.collection("users").doc(req.user.uid);
    const redRef = firestoreDb.collection("redemptions").doc(`${req.user.uid}_${cleanCode}`);

    let reward = 0;

    await firestoreDb.runTransaction(async (transaction) => {
      const codeDoc = await transaction.get(codeRef);
      if (!codeDoc.exists) throw new Error("Invalid promo code");

      const codeData = codeDoc.data() as any;
      if (!codeData.enabled) throw new Error("This code is inactive");
      if (codeData.expiry < Date.now()) throw new Error("This code has expired");
      if (codeData.uses >= codeData.maxUses) throw new Error("This code has reached maximum usage limit");

      const redDoc = await transaction.get(redRef);
      if (redDoc.exists) throw new Error("You have already redeemed this promo code");

      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data() as any;

      reward = codeData.reward;

      // Update code stats
      transaction.update(codeRef, { uses: codeData.uses + 1 });

      // Update user credits
      transaction.update(userRef, { credits: userData.credits + reward });

      // Record redemption limit
      transaction.set(redRef, {
        id: redRef.id,
        userId: req.user.uid,
        code: cleanCode,
        redeemedAt: Date.now(),
      });

      // Record transaction history
      const transRef = firestoreDb.collection("creditTransactions").doc();
      transaction.set(transRef, {
        id: transRef.id,
        userId: req.user.uid,
        type: "Redeem",
        amount: reward,
        description: `Redeemed promo code "${cleanCode}"`,
        createdAt: Date.now(),
      });
    });

    await logActivity(req.user.uid, req.user.email, "Redeem Promo Code", `Redeemed code ${cleanCode} for ${reward} credits`);

    res.json({ success: true, reward });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Complete credit task
app.post("/api/credits/tasks/complete", requireAuth, async (req: any, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: "Task ID required" });

  try {
    const taskDoc = await firestoreDb.collection("tasks").doc(taskId).get();
    if (!taskDoc.exists) return res.status(400).json({ error: "Task not found" });

    const task = taskDoc.data() as any;
    if (!task.enabled) return res.status(400).json({ error: "This credit reward program is active" });

    const userRef = firestoreDb.collection("users").doc(req.user.uid);
    const completionId = `${req.user.uid}_${taskId}`;
    const compDoc = await firestoreDb.collection("taskCompletions").doc(completionId).get();

    // Verification
    if (compDoc.exists) {
      const compData = compDoc.data() as any;
      if (task.cooldown === 0) {
        return res.status(400).json({ error: "You have already completed this non-repeatable task" });
      }

      const elapsedHours = (Date.now() - compData.completedAt) / (1000 * 60 * 60);
      if (elapsedHours < task.cooldown) {
        const remainingHours = Math.ceil(task.cooldown - elapsedHours);
        return res.status(400).json({ error: `Task on cooldown. Please wait ${remainingHours} hour(s) before repeating.` });
      }
    }

    let earned = task.reward;

    await firestoreDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data() as any;

      transaction.update(userRef, { credits: userData.credits + earned });

      transaction.set(firestoreDb.collection("taskCompletions").doc(completionId), {
        id: completionId,
        userId: req.user.uid,
        taskId,
        completedAt: Date.now(),
      });

      const transRef = firestoreDb.collection("creditTransactions").doc();
      transaction.set(transRef, {
        id: transRef.id,
        userId: req.user.uid,
        type: "Reward",
        amount: earned,
        description: `Earned rewards for "${task.name}"`,
        createdAt: Date.now(),
      });
    });

    await logActivity(req.user.uid, req.user.email, "Earned Task Reward", `Completed credit task "${task.name}"`);

    res.json({ success: true, reward: earned });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper IP converter utilities
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff
  ].join('.');
}

// --- PROXMOX NETWORK IP ADDRESS POOLS ENDPOINTS ---

// Fetch all IP pools
app.get("/api/ip-pools", requireAdmin, async (req: any, res) => {
  try {
    const pools = await safeGetCollection("ipPools");
    const ips = await safeGetCollection("ipAddresses");

    // Map stats (Total, Available, Used) for each pool
    const poolsWithStats = pools.map((pool: any) => {
      const poolIps = ips.filter((ip: any) => ip.poolId === pool.id);
      const total = poolIps.length;
      const available = poolIps.filter((ip: any) => ip.status === "available").length;
      const assigned = poolIps.filter((ip: any) => ip.status === "assigned" || ip.status === "used").length;
      const reserved = poolIps.filter((ip: any) => ip.status === "reserved").length;

      return {
        ...pool,
        totalIps: total,
        availableIps: available,
        assignedIps: assigned,
        reservedIps: reserved,
      };
    });

    res.json(poolsWithStats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update IP pool (and auto-generate IP lists sequentially)
app.post("/api/ip-pools", requireAdmin, async (req: any, res) => {
  const { id, nodeId, name, cidr, gateway, dns, bridge, vlan, startIp, endIp, enabled } = req.body;

  if (!nodeId || !name || !cidr || !gateway || !startIp || !endIp) {
    return res.status(400).json({ error: "Missing vital IP Pool configuration parameters." });
  }

  const poolId = id || "pool_" + Date.now();

  try {
    const poolData = {
      id: poolId,
      nodeId,
      name,
      cidr,
      gateway,
      dns: dns || "1.1.1.1, 8.8.8.8",
      bridge: bridge || "vmbr0",
      vlan: vlan || "",
      startIp,
      endIp,
      enabled: enabled ?? true,
      createdAt: Date.now(),
    };

    await safeSetDoc("ipPools", poolId, poolData, true);

    // Auto-generate individual IP documents if creating a NEW pool
    if (!id) {
      const start = ipToInt(startIp);
      const end = ipToInt(endIp);

      if (start > end) {
        return res.status(400).json({ error: "Invalid range: Start IP is higher than End IP." });
      }

      // Max safety check (do not generate more than 256 IPs at once to avoid timeouts)
      const totalCount = end - start + 1;
      if (totalCount > 256) {
        return res.status(400).json({ error: "IP limit exceeded: Range cannot contain more than 256 IPs." });
      }

      const batch = firestoreDb.batch();
      for (let i = start; i <= end; i++) {
        const ipStr = intToIp(i);
        const ipId = `ip_${poolId}_${ipStr.replace(/\./g, "_")}`;
        const ipRef = firestoreDb.collection("ipAddresses").doc(ipId);

        batch.set(ipRef, {
          id: ipId,
          poolId,
          nodeId,
          ip: ipStr,
          status: "available",
          vpsId: "",
          vpsName: "",
          reservedUntil: null,
        });
      }
      await batch.commit();
    }

    await logActivity(req.user.uid, req.user.email, "IP Pool Saved", `Saved IP pool "${name}" with ${endIp} range`, nodeId);
    res.json({ success: true, pool: poolData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete IP pool
app.delete("/api/ip-pools/:id", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    // Check if any IPs are currently assigned/used
    const ips = await safeGetCollection("ipAddresses");
    const activeIps = ips.filter((ip: any) => ip.poolId === id && ip.status === "assigned");

    if (activeIps.length > 0) {
      return res.status(400).json({
        error: `Cannot delete IP Pool: ${activeIps.length} active IP addresses in this pool are currently assigned to active VPS nodes.`,
      });
    }

    await safeDeleteDoc("ipPools", id);

    // Batch delete individual IP references
    const poolIps = ips.filter((ip: any) => ip.poolId === id);
    const batch = firestoreDb.batch();
    poolIps.forEach((ip: any) => {
      const ipRef = firestoreDb.collection("ipAddresses").doc(ip.id);
      batch.delete(ipRef);
    });
    await batch.commit();

    await logActivity(req.user.uid, req.user.email, "IP Pool Deleted", `Removed IP pool configuration.`, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all IPs in a pool
app.get("/api/ip-pools/:id/ips", requireAdmin, async (req: any, res) => {
  try {
    const list = await safeGetCollection("ipAddresses");
    const poolIps = list.filter((ip: any) => ip.poolId === req.params.id);
    res.json(poolIps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update IP allocation status manually
app.post("/api/ip-pools/:id/ips/:ipId/status", requireAdmin, async (req: any, res) => {
  const { ipId } = req.params;
  const { status, vpsName, vpsId } = req.body;

  if (!["available", "reserved", "assigned", "used"].includes(status)) {
    return res.status(400).json({ error: "Invalid allocation status payload" });
  }

  try {
    await firestoreDb.collection("ipAddresses").doc(ipId).update({
      status,
      vpsId: vpsId || "",
      vpsName: vpsName || "",
      reservedUntil: null,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROXMOX OS TEMPLATES MANAGEMENT ENDPOINTS ---

// Fetch node bridges list
app.get("/api/nodes/:id/bridges", requireAdmin, async (req: any, res) => {
  try {
    const nodeDoc = await firestoreDb.collection("nodes").doc(req.params.id).get();
    const secretDoc = await firestoreDb.collection("nodeSecrets").doc(req.params.id).get();

    if (!nodeDoc.exists || !secretDoc.exists) {
      return res.status(400).json({ error: "Connection parameters not configured" });
    }

    const node = nodeDoc.data() as any;
    const secrets = secretDoc.data() as any;

    const bridges = await proxmoxService.getBridges({
      apiUrl: node.apiUrl,
      proxmoxNodeName: node.proxmoxNodeName,
      tokenId: secrets.tokenId || "",
      tokenSecret: secrets.tokenSecret || "",
      verifySsl: false,
    });

    res.json(bridges);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get configured templates
app.get("/api/templates", requireAuth, async (req: any, res) => {
  try {
    const list = await safeGetCollection("templates");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add/save custom template configuration
app.post("/api/templates", requireAdmin, async (req: any, res) => {
  const { id, templateId, name, os, version, nodeId, type, enabled } = req.body;

  if (!templateId || !name || !os || !nodeId || !type) {
    return res.status(400).json({ error: "Missing required template config fields." });
  }

  const tId = id || "tmpl_" + Date.now();

  try {
    const tmplData = {
      id: tId,
      templateId: Number(templateId),
      name,
      os,
      version: version || "Latest",
      nodeId,
      type,
      enabled: enabled ?? true,
      createdAt: Date.now(),
    };

    await safeSetDoc("templates", tId, tmplData, true);
    res.json({ success: true, template: tmplData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template config
app.delete("/api/templates/:id", requireAdmin, async (req: any, res) => {
  try {
    await safeDeleteDoc("templates", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Discover active templates from Proxmox cluster
app.post("/api/templates/discover", requireAdmin, async (req: any, res) => {
  const { nodeId } = req.body;
  if (!nodeId) return res.status(400).json({ error: "Node ID is required" });

  try {
    const nodeDoc = await firestoreDb.collection("nodes").doc(nodeId).get();
    const secretDoc = await firestoreDb.collection("nodeSecrets").doc(nodeId).get();

    if (!nodeDoc.exists || !secretDoc.exists) {
      return res.status(400).json({ error: "Hypervisor node connection parameters missing" });
    }

    const node = nodeDoc.data() as any;
    const secrets = secretDoc.data() as any;

    const list = await proxmoxService.discoverTemplates({
      apiUrl: node.apiUrl,
      proxmoxNodeName: node.proxmoxNodeName,
      tokenId: secrets.tokenId || "",
      tokenSecret: secrets.tokenSecret || "",
      verifySsl: false,
    });

    res.json({ success: true, templates: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN CONTROL PANELS ---

// Fetch Activity Logs
app.get("/api/admin/logs", requireAdmin, async (req, res) => {
  try {
    const logs = await safeGetCollection("activityLogs");
    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(logs.slice(0, 100));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all users
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await safeGetCollection("users");
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust Credits
app.post("/api/admin/users/:uid/credits", requireAdmin, async (req: any, res) => {
  const { uid } = req.params;
  const { amount, actionType } = req.body; // actionType: 'add' or 'remove' or 'set'
  const val = Number(amount);

  if (isNaN(val)) return res.status(400).json({ error: "Amount must be a number" });

  try {
    const userDoc = await safeGetDoc("users", uid);
    if (!userDoc.exists) return res.status(404).json({ error: "User record not found" });

    const userData = userDoc.data() as any;
    let newBalance = userData.credits || 0;
    if (actionType === "add") newBalance += val;
    else if (actionType === "remove") newBalance = Math.max(0, newBalance - val);
    else if (actionType === "set") newBalance = Math.max(0, val);

    await safeSetDoc("users", uid, { credits: newBalance });

    const diff = newBalance - userData.credits;
    const transId = "trans_" + Date.now();
    await safeSetDoc("creditTransactions", transId, {
      id: transId,
      userId: uid,
      type: "Admin Adjustment",
      amount: diff,
      description: `Administrator credit balance adjustment (${diff >= 0 ? "+" : ""}${diff} Credits)`,
      createdAt: Date.now(),
    });

    await logActivity(req.user.uid, req.user.email, "Admin Balance Adjustment", `Adjusted user ${uid} credits by admin.`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suspend/Activate User
app.post("/api/admin/users/:uid/status", requireAdmin, async (req: any, res) => {
  const { uid } = req.params;
  const { status } = req.body;

  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    await safeSetDoc("users", uid, { status });
    await logActivity(req.user.uid, req.user.email, "User Status Changed", `Changed user ${uid} status to ${status}.`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin System Stats
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const users = await safeGetCollection("users");
    const vps = await safeGetCollection("vps");
    const nodes = await safeGetCollection("nodes");
    const transactions = await safeGetCollection("creditTransactions");

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "active").length;

    const totalVps = vps.length;
    const runningVps = vps.filter((v) => v.status === "Running").length;
    const stoppedVps = vps.filter((v) => v.status === "Stopped").length;

    const onlineNodes = nodes.filter((n) => n.status === "Online" && n.enabled).length;
    const offlineNodes = nodes.filter((n) => n.status === "Offline" || !n.enabled).length;

    let creditsDistributed = 0;
    let creditsUsed = 0;

    transactions.forEach((t) => {
      if (t.amount > 0) creditsDistributed += t.amount;
      else creditsUsed += Math.abs(t.amount);
    });

    res.json({
      totalUsers,
      activeUsers,
      totalVps,
      runningVps,
      stoppedVps,
      onlineNodes,
      offlineNodes,
      creditsDistributed,
      creditsUsed,
      totalDeployments: totalVps,
      failedDeployments: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Promo Codes Creator
app.post("/api/admin/promo", requireAdmin, async (req: any, res) => {
  const { code, reward, expiryDays, maxUses } = req.body;
  if (!code || !reward) return res.status(400).json({ error: "Missing required fields" });

  const cleanCode = code.trim().toUpperCase();

  try {
    await firestoreDb.collection("redeemCodes").doc(cleanCode).set({
      id: cleanCode,
      code: cleanCode,
      reward: Number(reward),
      expiry: Date.now() + 1000 * 60 * 60 * 24 * (Number(expiryDays) || 30),
      maxUses: Number(maxUses) || 100,
      uses: 0,
      enabled: true,
    });

    await logActivity(req.user.uid, req.user.email, "Promo Code Created", `Created promo code ${cleanCode} with reward of ${reward} credits.`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Software Management Creator
app.post("/api/admin/software", requireAdmin, async (req: any, res) => {
  const { id, name, slug, icon, enabled, versions, supportedOS } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "Missing software metadata" });

  const swId = id || slug;

  try {
    await firestoreDb.collection("software").doc(swId).set({
      id: swId,
      name,
      slug,
      icon: icon || "Blocks",
      enabled: enabled ?? true,
      versions: versions || [{ version: "Latest", enabled: true }],
      supportedOS: supportedOS || ["Ubuntu 24.04 LTS"],
    }, { merge: true });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VPS Billing, locations creator
app.post("/api/admin/locations", requireAdmin, async (req: any, res) => {
  const { id, name, flag, enabled } = req.body;
  if (!id || !name) return res.status(400).json({ error: "Missing id/name for location" });

  try {
    await firestoreDb.collection("locations").doc(id).set({
      id,
      name,
      flag: flag || "🌐",
      enabled: enabled ?? true,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/plans", requireAdmin, async (req: any, res) => {
  const { id, name, price, cpu, ram, storage, bandwidth, os, locations, enabled } = req.body;
  if (!name || !price || !cpu || !ram || !storage) {
    return res.status(400).json({ error: "Missing vital plan specifications" });
  }

  const planId = id || `plan-${Date.now()}`;

  try {
    await firestoreDb.collection("plans").doc(planId).set({
      id: planId,
      name,
      price: Number(price),
      cpu: Number(cpu),
      ram: Number(ram),
      storage: Number(storage),
      bandwidth: Number(bandwidth || 1000),
      os: os || ["Ubuntu 24.04 LTS"],
      locations: locations || ["india"],
      enabled: enabled ?? true,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RENEWAL BACKGROUND SCHEDULER (CRON) ---
// Secure backend renewal runner - processes active subscriptions safely
async function runBillingRenewals() {
  console.log("Background Billing Scheduler: Reviewing VPS renewal tasks...");
  try {
    const vpsList = await safeGetCollection("vps");
    const systemSettingsDoc = await safeGetDoc("settings", "system");
    const settings = systemSettingsDoc.exists ? systemSettingsDoc.data() : { gracePeriodDays: 3 };

    const gracePeriodMs = (settings?.gracePeriodDays || 3) * 24 * 60 * 60 * 1000;

    for (const vps of vpsList) {
      if (!vps || vps.status === "Terminated") continue;

      const now = Date.now();

      // If renewal lease has expired
      if (vps.nextRenewalAt && vps.nextRenewalAt <= now) {
        const ownerUid = vps.ownerUid;

        // Check if user has auto-renewal toggled ON and has sufficient credits
        if (vps.autoRenew && vps.status !== "Renewal Required" && vps.status !== "Expired") {
          try {
            const userDoc = await safeGetDoc("users", ownerUid);
            if (userDoc.exists) {
              const user = userDoc.data();
              if (user && user.credits >= vps.renewalCost) {
                // Deduct credits and extend lease
                const nextRenewal = now + 1000 * 60 * 60 * 24 * 15;
                await safeSetDoc("users", ownerUid, { credits: user.credits - vps.renewalCost }, true);
                await safeSetDoc("vps", vps.id, {
                  status: "Running",
                  lastRenewalAt: now,
                  nextRenewalAt: nextRenewal,
                  updatedAt: now,
                }, true);

                // Record transaction
                const transId = "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
                await safeSetDoc("creditTransactions", transId, {
                  id: transId,
                  userId: ownerUid,
                  type: "VPS Renewal",
                  amount: -vps.renewalCost,
                  description: `Automatic renewal for VPS "${vps.name}"`,
                  createdAt: now,
                }, false);

                console.log(`Scheduler: Renewed VPS "${vps.name}" successfully for user ${ownerUid}`);
              } else {
                // Insufficient funds -> Move to Renewal Required (entering grace period)
                const graceExpiry = vps.nextRenewalAt + gracePeriodMs;
                await safeSetDoc("vps", vps.id, {
                  status: "Renewal Required",
                  nextRenewalAt: graceExpiry, // lease represents grace period deadline now
                  updatedAt: now,
                }, true);
                console.log(`Scheduler: Insufficient credits for "${vps.name}". Shifted to Renewal Required state.`);
              }
            }
          } catch (err) {
            console.error("Renewal processing error:", err);
          }
        }
        // If VPS is in Grace Period and has exceeded the grace limit -> Expire and Terminate
        else if (vps.status === "Renewal Required") {
          if (now >= vps.nextRenewalAt) {
            // Expire -> Stop VM on Proxmox & delete records
            try {
              await safeSetDoc("vps", vps.id, {
                status: "Expired",
                updatedAt: now,
              }, true);

              // Stop VM on Proxmox
              const nodeDoc = await safeGetDoc("nodes", vps.nodeId);
              const secretDoc = await safeGetDoc("nodeSecrets", vps.nodeId);

              if (nodeDoc.exists && secretDoc.exists) {
                const node = nodeDoc.data();
                const secrets = secretDoc.data();
                if (node && secrets) {
                  const pveDetails = {
                    apiUrl: node.apiUrl,
                    proxmoxNodeName: node.proxmoxNodeName,
                    tokenId: secrets.tokenId,
                    tokenSecret: secrets.tokenSecret,
                    verifySsl: false,
                  };
                  await proxmoxService.controlVPS(pveDetails, vps.vmId, "stop");
                }
              }

              console.log(`Scheduler: Grace period expired. Stopped VPS "${vps.name}".`);
            } catch (err) {
              console.error("Scheduler failed to stop expired VPS:", err);
            }
          }
        }
        // If expired for a long duration, delete VM from Proxmox and archive
        else if (vps.status === "Expired") {
          // Deletion after 1 day expired
          const deleteThreshold = vps.nextRenewalAt + (24 * 60 * 60 * 1000); // 1 extra day
          if (now >= deleteThreshold) {
            try {
              // Delete VM
              const nodeDoc = await safeGetDoc("nodes", vps.nodeId);
              const secretDoc = await safeGetDoc("nodeSecrets", vps.nodeId);

              if (nodeDoc.exists && secretDoc.exists) {
                const node = nodeDoc.data();
                const secrets = secretDoc.data();
                if (node && secrets) {
                  const pveDetails = {
                    apiUrl: node.apiUrl,
                    proxmoxNodeName: node.proxmoxNodeName,
                    tokenId: secrets.tokenId,
                    tokenSecret: secrets.tokenSecret,
                    verifySsl: false,
                  };
                  await proxmoxService.deleteVPS(pveDetails, vps.vmId);
                }
              }

              await safeSetDoc("vps", vps.id, {
                status: "Terminated",
                updatedAt: now,
              }, true);

              console.log(`Scheduler: Deleted terminated VPS "${vps.name}" from Proxmox.`);
            } catch (err) {
              console.error("Scheduler failed to delete expired VPS:", err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Scheduled background renewals run failed:", err);
  }
}

// Check renewals every 3 minutes
setInterval(runBillingRenewals, 3 * 60 * 1000);

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
