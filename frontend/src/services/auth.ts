import { UserProfile } from '../types';
import { mockCurrentUser } from '../mock/data';

const ID_TOKEN_KEY = 'stayon_auth_token';
const ACCESS_TOKEN_KEY = 'stayon_access_token';
const REFRESH_TOKEN_KEY = 'stayon_refresh_token';
const TOKEN_EXPIRY_KEY = 'stayon_token_expiry';
const USER_KEY = 'stayon_user';

const COGNITO_REGION =
  import.meta.env.VITE_AWS_REGION ||
  import.meta.env.VITE_COGNITO_REGION ||
  'ap-south-1';

const COGNITO_CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID ||
  '4qdls2lml6sk7ei7i8dpjn9pn7';

const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

interface CognitoAuthResult {
  AccessToken: string;
  ExpiresIn: number;
  IdToken: string;
  RefreshToken?: string;
  TokenType: string;
}

interface CognitoClaims {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  name?: string;
  preferred_username?: string;
  exp: number;
  iat: number;
  aud: string;
  iss: string;
}

function parseJwtPayload(token: string): CognitoClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as CognitoClaims;
  } catch (e) {
    return null;
  }
}

function buildUserProfile(claims: CognitoClaims | null, fallbackEmail: string): UserProfile {
  const email = claims?.email || fallbackEmail || mockCurrentUser.email;
  const username = claims?.['cognito:username'] || email.split('@')[0];
  const name = claims?.name || claims?.preferred_username || username || mockCurrentUser.name;
  const id = claims?.sub || mockCurrentUser.id;

  return {
    ...mockCurrentUser,
    id,
    name,
    email,
    role: 'Student',
  };
}

export const authService = {
  /**
   * Returns the currently stored Cognito ID token.
   */
  getToken(): string | null {
    return localStorage.getItem(ID_TOKEN_KEY);
  },

  /**
   * Returns the stored Cognito Access token.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Returns the stored Cognito Refresh token.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Sets session data from a successful Cognito authentication response.
   */
  setSession(result: CognitoAuthResult, email: string): { token: string; user: UserProfile } {
    const token = result.IdToken;
    localStorage.setItem(ID_TOKEN_KEY, token);
    localStorage.setItem(ACCESS_TOKEN_KEY, result.AccessToken);
    if (result.RefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.RefreshToken);
    }
    const expiryMs = Date.now() + (result.ExpiresIn - 60) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryMs.toString());

    const claims = parseJwtPayload(token);
    const user = buildUserProfile(claims, email);
    this.setUser(user);

    return { token, user };
  },

  /**
   * Retrieves the cached UserProfile.
   */
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

  /**
   * Saves the UserProfile to localStorage.
   */
  setUser(user: UserProfile): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Checks if user is currently authenticated with a non-expired token or has a refresh token.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      return !!this.getRefreshToken();
    }
    return true;
  },

  /**
   * Asynchronously retrieves a valid ID token, refreshing it if expired.
   */
  async getValidToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      return await this.refreshSession();
    }
    return token;
  },

  /**
   * Initiates real Cognito USER_PASSWORD_AUTH authentication.
   */
  async login(email: string, password?: string): Promise<{ token: string; user: UserProfile }> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const response = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email.trim(),
          PASSWORD: password,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.__type) {
      const message = data.message || data.Message || 'Authentication failed. Please check your credentials.';
      throw new Error(message);
    }

    if (!data.AuthenticationResult) {
      if (data.ChallengeName) {
        throw new Error(`Authentication challenge required: ${data.ChallengeName}`);
      }
      throw new Error('Authentication did not return a valid result');
    }

    return this.setSession(data.AuthenticationResult, email);
  },

  /**
   * Refreshes the Cognito session using REFRESH_TOKEN_AUTH.
   */
  async refreshSession(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      const response = await fetch(COGNITO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.AuthenticationResult) {
        this.logout();
        return null;
      }

      const currentUser = this.getUser();
      const { token } = this.setSession(data.AuthenticationResult, currentUser.email);
      return token;
    } catch (err) {
      console.error('Failed to refresh Cognito session:', err);
      this.logout();
      return null;
    }
  },

  /**
   * Logs out the user and clears all tokens and session state.
   */
  logout(): void {
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
