export interface Session {
  email: string;
  login_token: string;
  token: string;
  secretKey: string;
  isAuthenticated: boolean;
}

let currentSession: Session = {
  email: "",
  login_token: "",
  token: "",
  secretKey: "",
  isAuthenticated: false,
};

export function getSession(): Session {
  return currentSession;
}

export function updateSession(updates: Partial<Session>): void {
  currentSession = { ...currentSession, ...updates };
}

export function resetSession(): void {
  currentSession = {
    email: "",
    login_token: "",
    token: "",
    secretKey: "",
    isAuthenticated: false,
  };
}
