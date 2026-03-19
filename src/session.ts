import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Session {
  email: string;
  login_token: string;
  token: string;
  secretKey: string;
  isAuthenticated: boolean;
}

const SESSION_DIR = join(homedir(), ".gpca");
const SESSION_FILE = join(SESSION_DIR, "session.json");

const EMPTY_SESSION: Session = {
  email: "",
  login_token: "",
  token: "",
  secretKey: "",
  isAuthenticated: false,
};

function loadSession(): Session {
  try {
    const data = readFileSync(SESSION_FILE, "utf-8");
    const parsed = JSON.parse(data) as Partial<Session>;
    return { ...EMPTY_SESSION, ...parsed };
  } catch {
    return { ...EMPTY_SESSION };
  }
}

function saveSession(session: Session): void {
  try {
    mkdirSync(SESSION_DIR, { recursive: true });
    writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), "utf-8");
  } catch {
    // Silent fail — worst case user re-logs in
  }
}

let currentSession: Session = loadSession();

export function getSession(): Session {
  return currentSession;
}

export function updateSession(updates: Partial<Session>): void {
  currentSession = { ...currentSession, ...updates };
  saveSession(currentSession);
}

export function resetSession(): void {
  currentSession = { ...EMPTY_SESSION };
  saveSession(currentSession);
}
