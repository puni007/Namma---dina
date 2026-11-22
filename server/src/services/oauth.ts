export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  picture?: string;
}

export interface FacebookProfile {
  id: string;
  email?: string;
  displayName: string;
  picture?: string;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isFacebookOAuthConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new Error('Failed to exchange Google authorization code.');
  }

  const tokens = await tokenRes.json() as { access_token: string; id_token: string };
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error('Failed to retrieve user profile from Google.');
  }

  const user = await userRes.json() as { sub: string; email?: string; name?: string; picture?: string };
  return {
    id: user.sub,
    email: user.email || '',
    displayName: user.name || user.email?.split('@')[0] || 'User',
    picture: user.picture,
  };
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error('Invalid Google ID token.');
  }

  const payload = await res.json() as { sub: string; email?: string; name?: string; picture?: string; aud?: string };
  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
    throw new Error('Google token audience does not match configured client ID.');
  }

  return {
    id: payload.sub,
    email: payload.email || '',
    displayName: payload.name || payload.email?.split('@')[0] || 'User',
    picture: payload.picture,
  };
}

export function getFacebookAuthUrl(redirectUri: string, state: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    throw new Error('Facebook Login is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env.');
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'email,public_profile',
    state,
    response_type: 'code',
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<FacebookProfile> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Facebook Login is not configured.');
  }

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
  );

  if (!tokenRes.ok) {
    throw new Error('Failed to exchange Facebook authorization code.');
  }

  const tokenData = await tokenRes.json() as { access_token: string };
  return verifyFacebookAccessToken(tokenData.access_token);
}

export async function verifyFacebookAccessToken(accessToken: string): Promise<FacebookProfile> {
  const res = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
  );

  if (!res.ok) {
    throw new Error('Invalid Facebook access token.');
  }

  const user = await res.json() as { id: string; name: string; email?: string; picture?: { data?: { url?: string } } };
  return {
    id: user.id,
    email: user.email,
    displayName: user.name || 'Facebook User',
    picture: user.picture?.data?.url,
  };
}
