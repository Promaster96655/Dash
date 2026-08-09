import admin from "firebase-admin";
import { initializeApp, cert, getApps, getApp, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Helper to read fallback local config if present
function getLocalConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    // Ignore error reading local config
  }
  return {};
}

const localConfig = getLocalConfig();

// Resolve project ID, client email, and private key
const projectId = process.env.FIREBASE_PROJECT_ID || localConfig.projectId || "magicaldashboard";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || localConfig.firestoreDatabaseId || "ai-studio-e4d83276-0ba5-406c-950a-8126fbfee8ef";

// Format multiline private key safely
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

let defaultApp: App;

if (!getApps().length) {
  // Safe startup validation
  const missingVars: string[] = [];
  if (!process.env.FIREBASE_PROJECT_ID && !localConfig.projectId) missingVars.push("Missing FIREBASE_PROJECT_ID");
  if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push("Missing FIREBASE_CLIENT_EMAIL");
  if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push("Missing FIREBASE_PRIVATE_KEY");

  if (missingVars.length > 0) {
    console.warn("[Firebase Admin Startup Validation Warning]:");
    missingVars.forEach((msg) => console.warn(`  - ${msg}`));
    console.warn("For Render deployments, please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Render Environment Settings.");
  }

  if (projectId && clientEmail && privateKey) {
    console.log(`[Firebase Admin] Initializing with service account cert for project: ${projectId}`);
    defaultApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    console.warn(`[Firebase Admin] Falling back to default app initialization for project: ${projectId}`);
    defaultApp = initializeApp({
      projectId,
    });
  }
} else {
  defaultApp = getApp();
}

// Initialize Firestore
export const firestoreDb = getFirestore(defaultApp, firestoreDatabaseId);
export const authAdmin = getAuth(defaultApp);

export { admin, defaultApp };
