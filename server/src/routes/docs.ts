import { Router, type Request, type Response } from 'express';

export const docsRouter = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Namma Dina (ನಮ್ಮ ದಿನ) — REST API',
    version: '1.0.0',
    description:
      'Official REST API for Namma Dina (ನಮ್ಮ ದಿನ) — OUR DAY. Comprehensive endpoints for task management, smart deterministic scheduling, habit rhythms, wellness metrics, reproductive health, Mitra AI flame companion, and bidirectional calendar synchronization.',
    contact: {
      name: 'Namma Dina Team',
      url: 'https://nammadina.app',
    },
  },
  servers: [
    { url: '/api', description: 'Default API Base Path' },
    { url: '/api/v1', description: 'Version 1 API Base Path' },
  ],
  components: {
    securitySchemes: {
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'nd_session',
        description: 'HTTP-only session cookie for web clients.',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token for native Android and mobile clients.',
      },
      CsrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF double-submit token for unsafe requests.',
      },
    },
  },
  security: [{ CookieAuth: [] }, { BearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        description: 'Verifies database connectivity and API uptime.',
        responses: {
          200: { description: 'API and PostgreSQL are healthy.' },
        },
      },
    },
    '/auth/providers': {
      get: {
        summary: 'Authentication providers status',
        description: 'Returns configured auth providers (Phone SMS, Google OAuth, Facebook, Email).',
        responses: {
          200: { description: 'Provider availability matrix.' },
        },
      },
    },
    '/auth/phone/send-otp': {
      post: {
        summary: 'Request Phone OTP',
        description: 'Sends a 6-digit OTP code to the provided phone number (+91 default, 60s cooldown).',
        responses: {
          200: { description: 'OTP dispatched.' },
          429: { description: 'Cooldown period active.' },
        },
      },
    },
    '/auth/phone/verify-otp': {
      post: {
        summary: 'Verify Phone OTP',
        description: 'Validates 6-digit OTP, authenticates or creates user, and issues session & tokens.',
        responses: {
          200: { description: 'Authentication successful.' },
          400: { description: 'Invalid or expired OTP.' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Email/Password Login',
        description: 'Authenticates with email and password.',
        responses: {
          200: { description: 'Authentication successful.' },
          401: { description: 'Invalid credentials.' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register new account',
        description: 'Creates a new account with email, password, and display name.',
        responses: {
          201: { description: 'Account created.' },
          400: { description: 'Validation failed or duplicate email.' },
        },
      },
    },
    '/auth/google/token': {
      post: {
        summary: 'Google Sign-In Token Exchange',
        description: 'Exchanges a Google ID Token from native mobile SDK for user session & tokens.',
        responses: {
          200: { description: 'Authentication successful.' },
        },
      },
    },
    '/auth/facebook/token': {
      post: {
        summary: 'Facebook Login Token Exchange',
        description: 'Exchanges a Facebook Graph access token for user session & tokens.',
        responses: {
          200: { description: 'Authentication successful.' },
        },
      },
    },
    '/mitra/state': {
      get: {
        summary: 'Get Mitra companion state',
        description: 'Fetches XP, level, evolution tier (Ember, Flame, Radiance, Aurora), and streak.',
        responses: {
          200: { description: 'Mitra state retrieved.' },
        },
      },
    },
    '/mitra/interact': {
      post: {
        summary: 'Interact with Mitra',
        description: 'Perform an interaction (pet, talk, encourage) triggering animated mood poses.',
        responses: {
          200: { description: 'Interaction recorded.' },
        },
      },
    },
    '/calendar/feed/{token}.ics': {
      get: {
        summary: 'Public webcal / iCal subscription feed',
        description: 'Token-protected universal calendar feed for Google, Apple, and Outlook calendars.',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'iCalendar text feed.' },
          404: { description: 'Feed token not found.' },
        },
      },
    },
    '/calendar/sync': {
      get: {
        summary: 'Get calendar sync configuration',
        description: 'Returns feed token, webcal URL, and sync status.',
        responses: {
          200: { description: 'Sync config returned.' },
        },
      },
      post: {
        summary: 'Trigger calendar sync',
        description: 'Performs bidirectional sync refresh and statistics export.',
        responses: {
          200: { description: 'Sync completed.' },
        },
      },
    },
    '/reproductive/profile': {
      get: {
        summary: 'Get reproductive health profile',
        description: 'Fetches active tracking mode (CYCLE_TRACKING or PREGNANCY) and consent state.',
        responses: {
          200: { description: 'Profile returned.' },
        },
      },
      post: {
        summary: 'Update reproductive health profile',
        description: 'Updates LMP, cycle length, gestational due date, and explicit consent.',
        responses: {
          200: { description: 'Profile updated.' },
        },
      },
    },
    '/reproductive/cycles': {
      get: {
        summary: 'Get cycle history',
        description: 'Fetches cycle days with decrypted symptoms and private notes.',
        responses: {
          200: { description: 'Decrypted cycle history.' },
        },
      },
      post: {
        summary: 'Log cycle or pregnancy entry',
        description: 'Logs symptoms and notes with field-level AES-256-GCM encryption.',
        responses: {
          201: { description: 'Entry saved securely.' },
        },
      },
    },
    '/reproductive/purge': {
      delete: {
        summary: 'Right-to-be-Forgotten Data Purge',
        description: 'Immediately and permanently deletes all reproductive health records and profile.',
        responses: {
          200: { description: 'All records purged.' },
        },
      },
    },
  },
};

docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

docsRouter.get('/', (_req: Request, res: Response) => {
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Namma Dina API — Swagger Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0b111e; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { color: #5eead4 !important; }
    .swagger-ui .scheme-container { background: #131c2e !important; }
    .swagger-ui .opblock { border-radius: 8px !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: window.location.pathname.replace(/\\/?$/, '/openapi.json'),
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(swaggerHtml);
});
