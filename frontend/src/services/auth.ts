import { UserProfile } from '../types';
import { mockCurrentUser } from '../mock/data';

const TOKEN_KEY = 'stayon_auth_token';
const USER_KEY = 'stayon_user';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getUser(): UserProfile {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return mockCurrentUser;
      }
    }
    return mockCurrentUser;
  },

  setUser(user: UserProfile): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async login(email: string, password?: string): Promise<{ token: string; user: UserProfile }> {
    // In production, invoke Cognito Auth APIs / AWS Amplify Auth
    // E.g. Amplify.Auth.signIn(email, password)
    const mockToken = `cognito-jwt-token-${Date.now()}`;
    const user: UserProfile = {
      ...mockCurrentUser,
      email: email || mockCurrentUser.email,
      name: email.split('@')[0] || mockCurrentUser.name
    };

    this.setToken(mockToken);
    this.setUser(user);

    return { token: mockToken, user };
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
