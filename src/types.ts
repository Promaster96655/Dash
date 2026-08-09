export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  credits: number;
  role: "user" | "admin";
  status: "active" | "suspended";
  createdAt: number;
}

export interface VPSPlan {
  id: string;
  name: string;
  price: number; // monthly or deployment cost
  cpu: number; // cores
  ram: number; // MB
  storage: number; // GB
  bandwidth: number; // GB
  os: string[]; // supported OS
  locations: string[]; // location IDs
  enabled: boolean;
}

export interface ProxmoxNode {
  id: string;
  name: string;
  nodeIdLabel?: string;
  isoCode?: string;
  flagEmoji?: string;
  countryName?: string;
  locationId: string;
  apiUrl: string;
  proxmoxNodeName: string;
  storageName?: string;
  bridgeName?: string;
  authenticationMethod?: "token" | "password";
  tokenId?: string;
  tokenSecret?: string;
  enablePort8006Terminal?: boolean;
  pveUser?: string;
  realm?: string;
  pvePassword?: string;
  enableAutoTerminal?: boolean;
  sshHost?: string;
  sshPort?: number | string;
  sshUsername?: string;
  sshPassword?: string;
  hasSavedTokenSecret?: boolean;
  hasSavedPvePassword?: boolean;
  hasSavedSshPassword?: boolean;
  status: "Online" | "Offline" | "Maintenance" | "Unverified";
  enabled: boolean;
  lastCheckedAt?: number;
  proxmoxVersion?: string;
  cpuUsage?: number;
  ramUsage?: number;
  storageUsage?: number;
  activeVMs?: number;
  totalVMs?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProxmoxNodeSecret {
  tokenId?: string;
  tokenSecret?: string;
  pvePassword?: string;
  sshPassword?: string;
  password?: string;
  username?: string;
}

export interface Location {
  id: string;
  name: string;
  flag?: string;
  enabled: boolean;
}

export interface VPSInstance {
  id: string;
  ownerUid: string;
  name: string;
  vmId: number;
  nodeId: string;
  locationId: string;
  planId: string;
  status: "Running" | "Stopped" | "Reinstalling" | "Expired" | "Renewal Required" | "Terminated";
  ipAddress: string;
  cpu: number; // cores
  ram: number; // MB
  storage: number; // GB
  os: string;
  software: {
    name: string;
    version: string;
    status: "Installed" | "Installing" | "Failed";
  }[];
  createdAt: number;
  updatedAt: number;
  lastRenewalAt: number;
  nextRenewalAt: number;
  renewalCost: number;
  autoRenew: boolean;
}

export interface RedeemCode {
  id: string;
  code: string;
  reward: number;
  expiry: number; // timestamp
  maxUses: number;
  uses: number;
  enabled: boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: "Reward" | "Redeem" | "VPS Deployment" | "VPS Renewal" | "Admin Adjustment" | "Refund";
  amount: number; // negative or positive
  description: string;
  createdAt: number;
}

export interface CreditTask {
  id: string;
  name: string;
  description: string;
  reward: number;
  type: "survey" | "follow" | "join_discord" | "daily_checkin" | "profile_setup";
  requirements: string;
  cooldown: number; // in hours
  maxCompletions: number;
  enabled: boolean;
}

export interface SoftwarePackage {
  id: string;
  name: string;
  slug: string;
  icon: string;
  enabled: boolean;
  versions: {
    version: string;
    enabled: boolean;
  }[];
  supportedOS: string[]; // e.g. ["ubuntu", "debian", "windows"]
}

export interface SystemSettings {
  registrationEnabled: boolean;
  googleLoginEnabled: boolean;
  maintenanceMode: boolean;
  vpsDeploymentEnabled: boolean;
  newUserCredits: number;
  maxVpsPerUser: number;
  announcement: string;
  dashboardName: string;
  logoUrl?: string;
  faviconUrl?: string;
  description?: string;
  renewalPeriodDays: number; // Default 15
  gracePeriodDays: number; // Default 3
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: number;
  nodeId?: string;
  vpsId?: string;
}

export interface IPPool {
  id: string;
  nodeId: string;
  name: string;
  cidr: string;
  gateway: string;
  dns: string;
  bridge: string;
  vlan?: string;
  startIp: string;
  endIp: string;
  enabled: boolean;
  createdAt: number;
}

export interface IPAddress {
  id: string;
  poolId: string;
  nodeId: string;
  ip: string;
  status: "available" | "reserved" | "assigned" | "used";
  vpsId?: string;
  vpsName?: string;
  reservedUntil?: number;
}

export interface ProxmoxTemplate {
  id: string;
  templateId: number;
  name: string;
  os: string;
  version: string;
  nodeId: string;
  type: "VM" | "LXC";
  enabled: boolean;
  createdAt: number;
}

