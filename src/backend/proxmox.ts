import https from "https";

export interface ProxmoxConnectionDetails {
  apiUrl: string;
  proxmoxNodeName: string;
  tokenId: string;
  tokenSecret: string;
  verifySsl: boolean;
}

export interface DiagnosticStep {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  message?: string;
}

export class ProxmoxService {
  private isDemo(apiUrl: string): boolean {
    return apiUrl.toLowerCase().includes("demo.magicalnode.com");
  }

  private httpsRequest(
    apiUrl: string,
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: string,
    verifySsl: boolean = false
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      let urlStr = apiUrl.replace(/\/$/, "");
      if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
        urlStr = "https://" + urlStr;
      }
      
      try {
        const parsedUrl = new URL(urlStr + path);
        const options: https.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method,
          headers: {
            ...headers,
            "Accept": "application/json",
          },
          rejectUnauthorized: verifySsl,
          timeout: 10000,
        };

        if (body) {
          options.headers = {
            ...options.headers,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body),
          };
        }

        const req = https.request(options, (res) => {
          let responseBody = "";
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () => {
            try {
              const parsed = responseBody ? JSON.parse(responseBody) : {};
              resolve({ status: res.statusCode || 200, data: parsed });
            } catch (err) {
              reject(new Error(`Invalid JSON response: ${responseBody.substring(0, 200)}`));
            }
          });
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Connection timeout to Proxmox host"));
        });

        if (body) {
          req.write(body);
        }
        req.end();
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Simple connection test for backward compatibility
   */
  async testConnection(details: ProxmoxConnectionDetails): Promise<{
    success: boolean;
    version?: string;
    error?: string;
  }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (details.tokenSecret === "fail") {
        return { success: false, error: "Authentication failed: Invalid API Token ID or Secret" };
      }
      return { success: true, version: "Proxmox VE 8.1.4 (Demo Mode)" };
    }

    try {
      const headers = {
        "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}`,
      };
      const res = await this.httpsRequest(details.apiUrl, "GET", "/api2/json/version", headers, undefined, details.verifySsl);

      if (res.status === 401 || res.status === 403) {
        return { success: false, error: `Authentication Failed (HTTP ${res.status})` };
      }
      if (res.status !== 200) {
        return { success: false, error: `Server returned HTTP ${res.status}` };
      }

      const version = res.data?.data?.version || "Connected";
      return { success: true, version: `Proxmox VE ${version}` };
    } catch (err: any) {
      return { success: false, error: err.message || "Connection timeout or server unreachable" };
    }
  }

  /**
   * Run detailed progressive diagnostics of Proxmox Node connection
   */
  async testConnectionDetailed(
    details: ProxmoxConnectionDetails,
    bridge: string = "vmbr0",
    storage: string = "local"
  ): Promise<{
    success: boolean;
    steps: DiagnosticStep[];
    error?: string;
  }> {
    const steps: DiagnosticStep[] = [
      { id: "connecting", name: "Connecting to Proxmox...", status: "pending" },
      { id: "api", name: "Checking API...", status: "pending" },
      { id: "auth", name: "Checking authentication...", status: "pending" },
      { id: "node", name: "Checking node...", status: "pending" },
      { id: "permissions", name: "Checking permissions...", status: "pending" },
      { id: "storage", name: "Checking storage...", status: "pending" },
      { id: "bridge", name: "Checking network bridge...", status: "pending" },
    ];

    const updateStep = (id: string, status: "running" | "success" | "failed", message?: string) => {
      const step = steps.find((s) => s.id === id);
      if (step) {
        step.status = status;
        if (message) step.message = message;
      }
    };

    if (this.isDemo(details.apiUrl)) {
      // Simulate gorgeous progressive response with intervals
      updateStep("connecting", "running");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("connecting", "success", "Connected to demo.magicalnode.com");

      updateStep("api", "running");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("api", "success", "Proxmox API endpoint is active");

      updateStep("auth", "running");
      await new Promise((r) => setTimeout(r, 400));
      if (details.tokenSecret === "fail") {
        updateStep("auth", "failed", "Invalid Token Secret");
        return { success: false, steps };
      }
      updateStep("auth", "success", `Authenticated as ${details.tokenId}`);

      updateStep("node", "running");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("node", "success", `Node "${details.proxmoxNodeName}" is Online`);

      updateStep("permissions", "running");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("permissions", "success", "Administrator (PVEVMAdmin / PVEDatastoreAdmin) confirmed");

      updateStep("storage", "running");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("storage", "success", `Storage "${storage}" is active & writeable`);

      updateStep("bridge", "running");
      await new Promise((r) => setTimeout(r, 400));
      if (bridge === "fail-bridge") {
        updateStep("bridge", "failed", `Bridge "${bridge}" was not found on this node.`);
        return { success: false, steps };
      }
      updateStep("bridge", "success", `Bridge "${bridge}" found and active`);

      return { success: true, steps };
    }

    // --- REAL PROXMOX API CHECKS ---
    const headers = {
      "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}`,
    };

    try {
      // 1. Connecting
      updateStep("connecting", "running");
      // Just test parsing and endpoint reachability
      let hostClean = details.apiUrl.replace(/\/$/, "");
      const urlObject = new URL(hostClean.startsWith("http") ? hostClean : "https://" + hostClean);
      updateStep("connecting", "success", `Endpoint resolved: ${urlObject.hostname}:${urlObject.port || 443}`);

      // 2. API Check
      updateStep("api", "running");
      let versionRes;
      try {
        versionRes = await this.httpsRequest(details.apiUrl, "GET", "/api2/json/version", headers, undefined, details.verifySsl);
      } catch (err: any) {
        updateStep("api", "failed", `Failed to reach API endpoint: ${err.message}`);
        return { success: false, steps, error: `API Connection Failed: ${err.message}` };
      }
      updateStep("api", "success", `API active. Version: ${versionRes.data?.data?.version || "Unknown"}`);

      // 3. Auth Check
      updateStep("auth", "running");
      if (versionRes.status === 401 || versionRes.status === 403) {
        updateStep("auth", "failed", "Invalid credentials or API Token ID/Secret");
        return { success: false, steps, error: "Authentication Failed: Token is unauthorized" };
      }
      updateStep("auth", "success", "Token authenticated successfully");

      // 4. Node Status Check
      updateStep("node", "running");
      const nodeStatusRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/status`,
        headers,
        undefined,
        details.verifySsl
      );
      if (nodeStatusRes.status !== 200) {
        updateStep("node", "failed", `Node "${details.proxmoxNodeName}" not found or offline (HTTP ${nodeStatusRes.status})`);
        return { success: false, steps, error: `Hypervisor node offline: ${details.proxmoxNodeName}` };
      }
      updateStep("node", "success", `Hypervisor node "${details.proxmoxNodeName}" is Online`);

      // 5. Permissions Check
      updateStep("permissions", "running");
      // Try to query node configurations to verify privileges
      const clusterRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        "/api2/json/cluster/resources",
        headers,
        undefined,
        details.verifySsl
      );
      if (clusterRes.status !== 200) {
        updateStep("permissions", "failed", "Insufficient API Token permissions (Requires PVEAdmin privileges)");
        return { success: false, steps, error: "Privilege verification failed" };
      }
      updateStep("permissions", "success", "PVE API permissions verified");

      // 6. Storage Check
      updateStep("storage", "running");
      const storageRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/storage/${storage}`,
        headers,
        undefined,
        details.verifySsl
      );
      if (storageRes.status !== 200) {
        updateStep("storage", "failed", `Storage volume "${storage}" is missing or inactive on the node.`);
        return { success: false, steps, error: `Storage volume invalid: ${storage}` };
      }
      updateStep("storage", "success", `Storage "${storage}" is available (Used: ${Math.round(((storageRes.data?.data?.used || 0) / (storageRes.data?.data?.total || 1)) * 100)}%)`);

      // 7. Bridge Check
      updateStep("bridge", "running");
      const networkRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/network`,
        headers,
        undefined,
        details.verifySsl
      );
      if (networkRes.status !== 200) {
        updateStep("bridge", "failed", "Could not query network interfaces from Proxmox");
        return { success: false, steps, error: "Network check failed" };
      }

      const interfaces = networkRes.data?.data || [];
      const targetBridge = interfaces.find((i: any) => i.iface === bridge && i.type === "bridge");

      if (!targetBridge) {
        updateStep("bridge", "failed", `Bridge "${bridge}" was not found on this node.`);
        return { success: false, steps, error: `Network bridge not configured: ${bridge}` };
      }

      if (!targetBridge.active) {
        updateStep("bridge", "failed", `Bridge "${bridge}" exists but is currently INACTIVE.`);
        return { success: false, steps, error: `Bridge inactive: ${bridge}` };
      }

      updateStep("bridge", "success", `Bridge "${bridge}" exists and is active`);

      return { success: true, steps };
    } catch (err: any) {
      return { success: false, steps, error: err.message || "Uncaught diagnostics failure" };
    }
  }

  /**
   * Get node resource utilization
   */
  async getNodeResources(details: ProxmoxConnectionDetails): Promise<{
    cpu: number;
    ram: number;
    storage: number;
    activeVMs: number;
    totalVMs: number;
  }> {
    if (this.isDemo(details.apiUrl)) {
      const t = Date.now();
      const cpu = Math.floor(25 + 15 * Math.sin(t / 60000));
      const ram = Math.floor(52 + 5 * Math.sin(t / 120000));
      const storage = 41;
      return { cpu, ram, storage, activeVMs: 18, totalVMs: 24 };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const statusRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/status`,
        headers,
        undefined,
        details.verifySsl
      );

      if (statusRes.status !== 200) throw new Error("Could not fetch resources");

      const data = statusRes.data?.data || {};
      const cpu = Math.round((data.cpu || 0) * 100);
      const ram = data.memory ? Math.round((data.memory.used / data.memory.total) * 100) : 50;
      const storage = data.rootfs ? Math.round((data.rootfs.used / data.rootfs.total) * 100) : 40;

      // Get VM and LXC counts
      let totalVMs = 0;
      let activeVMs = 0;

      const qemuRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/qemu`,
        headers,
        undefined,
        details.verifySsl
      );
      if (qemuRes.status === 200) {
        const vms = qemuRes.data?.data || [];
        totalVMs += vms.length;
        activeVMs += vms.filter((vm: any) => vm.status === "running").length;
      }

      const lxcRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/lxc`,
        headers,
        undefined,
        details.verifySsl
      );
      if (lxcRes.status === 200) {
        const cts = lxcRes.data?.data || [];
        totalVMs += cts.length;
        activeVMs += cts.filter((ct: any) => ct.status === "running").length;
      }

      return { cpu, ram, storage, activeVMs, totalVMs };
    } catch (err) {
      console.error("getNodeResources error:", err);
      return { cpu: 0, ram: 0, storage: 0, activeVMs: 0, totalVMs: 0 };
    }
  }

  /**
   * Discover bridges on a Proxmox node
   */
  async getBridges(details: ProxmoxConnectionDetails): Promise<string[]> {
    if (this.isDemo(details.apiUrl)) {
      return ["vmbr0", "vmbr1", "vmbr2"];
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const res = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/network`,
        headers,
        undefined,
        details.verifySsl
      );

      if (res.status === 200) {
        const list = res.data?.data || [];
        return list.filter((i: any) => i.type === "bridge" && i.active).map((i: any) => i.iface);
      }
      return ["vmbr0"];
    } catch (err) {
      return ["vmbr0"];
    }
  }

  /**
   * Discover VM/LXC templates on a Proxmox node
   */
  async discoverTemplates(details: ProxmoxConnectionDetails): Promise<{
    templateId: number;
    name: string;
    type: "VM" | "LXC";
    node: string;
  }[]> {
    if (this.isDemo(details.apiUrl)) {
      return [
        { templateId: 9000, name: "Ubuntu 24.04 LTS (Template)", type: "VM", node: details.proxmoxNodeName },
        { templateId: 9010, name: "Debian 12 (Template)", type: "VM", node: details.proxmoxNodeName },
        { templateId: 9020, name: "CentOS Stream 9 (Template)", type: "VM", node: details.proxmoxNodeName },
        { templateId: 8000, name: "Ubuntu 22.04 (LXC Template)", type: "LXC", node: details.proxmoxNodeName },
        { templateId: 8010, name: "Alpine Linux 3.19 (LXC Template)", type: "LXC", node: details.proxmoxNodeName },
      ];
    }

    const templates: { templateId: number; name: string; type: "VM" | "LXC"; node: string }[] = [];
    const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };

    try {
      // 1. Fetch QEMU templates
      const qemuRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/qemu`,
        headers,
        undefined,
        details.verifySsl
      );
      if (qemuRes.status === 200) {
        const list = qemuRes.data?.data || [];
        list.forEach((item: any) => {
          if (item.template === 1) {
            templates.push({
              templateId: Number(item.vmid),
              name: item.name || `VM ${item.vmid} Template`,
              type: "VM",
              node: details.proxmoxNodeName,
            });
          }
        });
      }

      // 2. Fetch LXC templates
      const lxcRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/nodes/${details.proxmoxNodeName}/lxc`,
        headers,
        undefined,
        details.verifySsl
      );
      if (lxcRes.status === 200) {
        const list = lxcRes.data?.data || [];
        list.forEach((item: any) => {
          if (item.template === 1) {
            templates.push({
              templateId: Number(item.vmid),
              name: item.name || `CT ${item.vmid} Template`,
              type: "LXC",
              node: details.proxmoxNodeName,
            });
          }
        });
      }
    } catch (err) {
      console.error("discoverTemplates error:", err);
    }

    return templates;
  }

  /**
   * Check if a VMID/CTID is already taken on Proxmox
   */
  async checkVMIDAvailable(details: ProxmoxConnectionDetails, vmid: number): Promise<boolean> {
    if (this.isDemo(details.apiUrl)) {
      return true;
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const res = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/cluster/resources`,
        headers,
        undefined,
        details.verifySsl
      );

      if (res.status === 200) {
        const list = res.data?.data || [];
        const match = list.find((r: any) => r.vmid === vmid && (r.type === "qemu" || r.type === "lxc"));
        return !match;
      }
      return true;
    } catch (err) {
      return true;
    }
  }

  /**
   * Clone and provision a Qemu VM
   */
  async createVM(
    details: ProxmoxConnectionDetails,
    vmId: number,
    templateId: number,
    name: string,
    ramMb: number,
    cpuCores: number,
    storageGb: number,
    bridge: string,
    ip: string,
    gateway?: string,
    password?: string
  ): Promise<{ success: boolean; taskid?: string; error?: string }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((r) => setTimeout(r, 1200));
      return { success: true, taskid: "UPID:demo:00001:start" };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const clonePath = `/api2/json/nodes/${details.proxmoxNodeName}/qemu/${templateId}/clone`;
      
      // 1. Dispatch clone command
      const cloneBody = new URLSearchParams({
        newid: vmId.toString(),
        name: name,
        full: "1", // full clone
      }).toString();

      const cloneRes = await this.httpsRequest(details.apiUrl, "POST", clonePath, headers, cloneBody, details.verifySsl);

      if (cloneRes.status !== 200) {
        throw new Error(cloneRes.data?.errors || `Clone request failed with status ${cloneRes.status}`);
      }

      // Wait a few seconds for clone initialization task
      await new Promise((r) => setTimeout(r, 5000));

      // 2. Configure VM resources & network Cloud-init parameters
      const configPath = `/api2/json/nodes/${details.proxmoxNodeName}/qemu/${vmId}/config`;
      
      const configParams: Record<string, string> = {
        memory: ramMb.toString(),
        cores: cpuCores.toString(),
        net0: `virtio,bridge=${bridge}`,
      };

      if (ip) {
        const gwStr = gateway ? `,gw=${gateway}` : "";
        configParams.ipconfig0 = `ip=${ip}${gwStr}`;
      }

      if (password) {
        configParams.cipassword = password;
      }

      const configBody = new URLSearchParams(configParams).toString();
      const configRes = await this.httpsRequest(details.apiUrl, "POST", configPath, headers, configBody, details.verifySsl);

      if (configRes.status !== 200) {
        console.warn("Cloud-init config modification returned error status:", configRes.status);
      }

      return { success: true, taskid: cloneRes.data?.data };
    } catch (err: any) {
      console.error("createVM error:", err);
      return { success: false, error: err.message || "Proxmox VM cloning failed" };
    }
  }

  /**
   * Clone or create an LXC Container
   */
  async createLXC(
    details: ProxmoxConnectionDetails,
    vmId: number,
    templateId: number,
    name: string,
    ramMb: number,
    cpuCores: number,
    storageGb: number,
    bridge: string,
    ip: string,
    gateway?: string,
    password?: string
  ): Promise<{ success: boolean; taskid?: string; error?: string }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((r) => setTimeout(r, 1200));
      return { success: true, taskid: "UPID:demo:00002:start" };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const clonePath = `/api2/json/nodes/${details.proxmoxNodeName}/lxc/${templateId}/clone`;
      
      // LXCs cloning
      const cloneBody = new URLSearchParams({
        newid: vmId.toString(),
        hostname: name,
        full: "1",
      }).toString();

      const cloneRes = await this.httpsRequest(details.apiUrl, "POST", clonePath, headers, cloneBody, details.verifySsl);

      if (cloneRes.status !== 200) {
        throw new Error(cloneRes.data?.errors || `Clone CT request failed with status ${cloneRes.status}`);
      }

      await new Promise((r) => setTimeout(r, 5000));

      // Configure CT net0 & size limits
      const configPath = `/api2/json/nodes/${details.proxmoxNodeName}/lxc/${vmId}/config`;
      const netConfig = `name=eth0,bridge=${bridge},ip=${ip}${gateway ? `,gw=${gateway}` : ""}`;
      
      const configBody = new URLSearchParams({
        cores: cpuCores.toString(),
        memory: ramMb.toString(),
        net0: netConfig,
      }).toString();

      const configRes = await this.httpsRequest(details.apiUrl, "POST", configPath, headers, configBody, details.verifySsl);

      return { success: true, taskid: cloneRes.data?.data };
    } catch (err: any) {
      console.error("createLXC error:", err);
      return { success: false, error: err.message || "Proxmox LXC cloning failed" };
    }
  }

  /**
   * Legacy wrapper for createVPS
   */
  async createVPS(
    details: ProxmoxConnectionDetails,
    vmId: number,
    name: string,
    ramMb: number,
    cpuCores: number,
    storageGb: number,
    os: string
  ): Promise<{ success: boolean; ipAddress?: string; error?: string }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const ip = `192.168.10.${Math.floor(10 + Math.random() * 200)}`;
      return { success: true, ipAddress: ip };
    }

    try {
      // Fallback createVM from some default template (e.g. 9000)
      const res = await this.createVM(details, vmId, 9000, name, ramMb, cpuCores, storageGb, "vmbr0", `10.0.0.${Math.floor(20 + Math.random() * 200)}/24`);
      if (res.success) {
        await this.controlVPS(details, vmId, "start");
        return { success: true, ipAddress: `10.0.0.${Math.floor(20 + Math.random() * 200)}` };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Control VM Power Operations (start, stop, shutdown, reboot)
   */
  async controlVPS(
    details: ProxmoxConnectionDetails,
    vmId: number,
    action: "start" | "stop" | "shutdown" | "reboot"
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { success: true };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      const proxmoxAction = action === "reboot" ? "reboot" : action === "shutdown" ? "shutdown" : action === "stop" ? "stop" : "start";
      
      // Check if it is Qemu VM or LXC CT
      let isLXC = false;
      const clusterRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/cluster/resources`,
        headers,
        undefined,
        details.verifySsl
      );

      if (clusterRes.status === 200) {
        const list = clusterRes.data?.data || [];
        const match = list.find((r: any) => r.vmid === vmId);
        if (match && match.type === "lxc") {
          isLXC = true;
        }
      }

      const typePath = isLXC ? "lxc" : "qemu";
      const targetUrl = `/api2/json/nodes/${details.proxmoxNodeName}/${typePath}/${vmId}/status/${proxmoxAction}`;

      const response = await this.httpsRequest(details.apiUrl, "POST", targetUrl, headers, undefined, details.verifySsl);

      if (response.status !== 200) {
        throw new Error(response.data?.errors || `HTTP status ${response.status}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("controlVPS error:", err);
      return { success: false, error: err.message || "Proxmox power control API failed" };
    }
  }

  /**
   * Get VM Status
   */
  async getVPSStatus(
    details: ProxmoxConnectionDetails,
    vmId: number
  ): Promise<{ status: "Running" | "Stopped"; cpu: number; ram: number; uptime: number }> {
    if (this.isDemo(details.apiUrl)) {
      const rand = Math.random();
      return {
        status: "Running",
        cpu: Math.floor(5 + rand * 12),
        ram: Math.floor(30 + rand * 10),
        uptime: 3600 + Math.floor(rand * 600),
      };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      
      // Determine VM type
      let isLXC = false;
      const clusterRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/cluster/resources`,
        headers,
        undefined,
        details.verifySsl
      );

      if (clusterRes.status === 200) {
        const list = clusterRes.data?.data || [];
        const match = list.find((r: any) => r.vmid === vmId);
        if (match && match.type === "lxc") {
          isLXC = true;
        }
      }

      const typePath = isLXC ? "lxc" : "qemu";
      const targetUrl = `/api2/json/nodes/${details.proxmoxNodeName}/${typePath}/${vmId}/status/current`;

      const response = await this.httpsRequest(details.apiUrl, "GET", targetUrl, headers, undefined, details.verifySsl);

      if (response.status !== 200) throw new Error("Status API returned failure");
      const data = response.data?.data || {};

      return {
        status: data.status === "running" ? "Running" : "Stopped",
        cpu: Math.round((data.cpu || 0) * 100),
        ram: data.maxmem ? Math.round((data.mem / data.maxmem) * 100) : 0,
        uptime: data.uptime || 0,
      };
    } catch (err) {
      return { status: "Stopped", cpu: 0, ram: 0, uptime: 0 };
    }
  }

  /**
   * Delete VM
   */
  async deleteVPS(details: ProxmoxConnectionDetails, vmId: number): Promise<{ success: boolean; error?: string }> {
    if (this.isDemo(details.apiUrl)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    }

    try {
      const headers = { "Authorization": `PVEAPIToken=${details.tokenId}=${details.tokenSecret}` };
      
      let isLXC = false;
      const clusterRes = await this.httpsRequest(
        details.apiUrl,
        "GET",
        `/api2/json/cluster/resources`,
        headers,
        undefined,
        details.verifySsl
      );

      if (clusterRes.status === 200) {
        const list = clusterRes.data?.data || [];
        const match = list.find((r: any) => r.vmid === vmId);
        if (match && match.type === "lxc") {
          isLXC = true;
        }
      }

      const typePath = isLXC ? "lxc" : "qemu";
      const targetUrl = `/api2/json/nodes/${details.proxmoxNodeName}/${typePath}/${vmId}`;

      const response = await this.httpsRequest(details.apiUrl, "DELETE", targetUrl, headers, undefined, details.verifySsl);

      if (response.status !== 200) {
        throw new Error(response.data?.errors || `Status code ${response.status}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("deleteVPS error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const proxmoxService = new ProxmoxService();
