import admin from "firebase-admin";
import { initializeApp, cert, getApps, getApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
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
export const projectId = process.env.FIREBASE_PROJECT_ID || localConfig.projectId || "magicaldashboard";
export const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
export const firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || localConfig.firestoreDatabaseId || "ai-studio-e4d83276-0ba5-406c-950a-8126fbfee8ef";

// Format multiline private key safely
export const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

let defaultApp: App | null = null;
let firestoreDb: Firestore | null = null;
let authAdmin: Auth | null = null;
let isFirebaseAdminConfigured = false;
let firebaseConfigError: string | null = null;

if (clientEmail && privateKey) {
  try {
    if (!getApps().length) {
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
      defaultApp = getApp();
    }
    firestoreDb = getFirestore(defaultApp, firestoreDatabaseId);
    authAdmin = getAuth(defaultApp);
    isFirebaseAdminConfigured = true;
    console.log(`[Firebase Admin] Connected successfully to project "${projectId}" (database: "${firestoreDatabaseId}")`);
  } catch (err: any) {
    firebaseConfigError = `Failed to initialize Firebase Admin: ${err?.message || err}`;
    console.error(`[Firebase Admin Initialization Error]:`, firebaseConfigError);
  }
} else {
  firebaseConfigError = "Firebase Admin configuration is missing. Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Render Environment Variables.";
  console.warn(`[Firebase Admin Notice]: ${firebaseConfigError}`);
}

export {
  admin,
  defaultApp,
  firestoreDb,
  authAdmin,
  isFirebaseAdminConfigured,
  firebaseConfigError,
};

