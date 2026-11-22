import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type FieldErrors, type Path, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Leaf,
  Mail,
  Menu,
  Phone,
  RotateCw,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { api, sendData, setAuthTokens, type AuthTokens } from '../lib/api';
import { clearUtmForSession, getUtmForRegistration } from '../lib/utm';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Field, TextInput } from '../components/ui';
import { ScrollReveal } from '../components/ScrollReveal';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Add your name.').max(60),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(100),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function Brand() {
  return (
    <Link to="/" className="brand auth-brand">
      <span className="brand-mark">
        <span />
      </span>
      <span>
        <strong>namma dina</strong>
        <small>ನಮ್ಮ ದಿನ · OUR DAY</small>
      </span>
    </Link>
  );
}

function AuthInput<T extends Record<string, string>>({
  label,
  name,
  register,
  errors,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: string;
  placeholder?: string;
}) {
  const error = errors[name]?.message as string | undefined;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const inputId = `auth-${String(name)}`;
  const input = (
    <TextInput
      id={inputId}
      {...register(name)}
      type={isPassword && passwordVisible ? 'text' : type}
      placeholder={placeholder}
      aria-invalid={!!error}
      aria-describedby={error ? `${inputId}-error` : undefined}
    />
  );
  const errorMessage = error && <small id={`${inputId}-error`} className="field-error">{error}</small>;
  if (!isPassword) return <Field label={label}>{input}{errorMessage}</Field>;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <span className="password-input-wrap">
        {input}
        <button
          className="password-visibility"
          type="button"
          onClick={() => setPasswordVisible((visible) => !visible)}
          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          aria-pressed={passwordVisible}
        >
          {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {errorMessage}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function PhoneOtpForm({ onSuccess }: { onSuccess: (user: { onboardingDone: boolean }) => void }) {
  const { t } = useLanguage();
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [cooldown, setCooldown] = useState(0);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendOtp = useMutation({
    mutationFn: async () => {
      setError('');
      const res = await api<{ message: string; cooldownSeconds: number; debugOtp?: string }>('/auth/phone/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone, countryCode }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setStep('otp');
      setCooldown(data.cooldownSeconds || 60);
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp);
        setOtp(data.debugOtp);
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not send verification code.');
    },
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      setError('');
      const res = await api<{ user: { onboardingDone: boolean }; tokens?: AuthTokens }>('/auth/phone/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone, countryCode, otp, displayName: name.trim() || undefined }),
      });
      if (res.data.tokens) await setAuthTokens(res.data.tokens);
      return res.data;
    },
    onSuccess: (data) => {
      onSuccess(data.user);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    },
  });

  if (step === 'phone') {
    return (
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!phone.trim() || phone.trim().length < 8) {
            setError('Please enter a valid phone number (10 digits).');
            return;
          }
          sendOtp.mutate();
        }}
      >
        <Field label={t.phoneAuth}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="text-input"
              style={{ width: '92px', flexShrink: 0, padding: '0 8px', fontSize: '13px' }}
            >
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+61">🇦🇺 +61</option>
            </select>
            <TextInput
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
        </Field>
        {error && <p className="inline-error">{error}</p>}
        <Button disabled={sendOtp.isPending} className="full-width">
          {sendOtp.isPending ? 'Sending code…' : t.sendOtp} <ArrowRight size={16} />
        </Button>
      </form>
    );
  }

  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (otp.length < 4) {
          setError('Please enter the 6-digit code.');
          return;
        }
        verifyOtp.mutate();
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Code sent to <strong>{countryCode} {phone}</strong>
        </span>
        <button
          type="button"
          onClick={() => { setStep('phone'); setDebugOtp(null); setError(''); }}
          style={{ background: 'none', border: 'none', color: '#5eead4', fontSize: '12px', cursor: 'pointer' }}
        >
          Change
        </button>
      </div>

      <Field label={t.enterOtp}>
        <TextInput
          type="number"
          placeholder="123456"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.slice(0, 6))}
          style={{ letterSpacing: '6px', fontSize: '18px', textAlign: 'center' }}
          autoFocus
        />
      </Field>

      <Field label="Your name (for your space)">
        <TextInput
          type="text"
          placeholder="e.g. Anand"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      {debugOtp && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#6ee7b7',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚡ <strong>Demo Verification Code:</strong> <strong style={{ fontSize: '16px', letterSpacing: '3px', color: '#fff', marginLeft: '6px' }}>{debugOtp}</strong></span>
            <button
              type="button"
              onClick={() => setOtp(debugOtp)}
              style={{
                background: 'rgba(16, 185, 129, 0.25)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
                padding: '3px 9px',
                cursor: 'pointer'
              }}
            >
              Auto-fill
            </button>
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            Telecom SMS requires Twilio or MSG91 gateway credentials. Since no SMS provider is configured, this instant code is provided so you can log in immediately.
          </span>
        </div>
      )}

      {error && <p className="inline-error">{error}</p>}

      <Button disabled={verifyOtp.isPending} className="full-width">
        {verifyOtp.isPending ? 'Verifying…' : t.verifyOtp} <Check size={16} />
      </Button>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
        <button
          type="button"
          disabled={cooldown > 0 || sendOtp.isPending}
          onClick={() => sendOtp.mutate()}
          style={{ background: 'none', border: 'none', color: cooldown > 0 ? 'var(--muted)' : '#5eead4', fontSize: '12px', cursor: cooldown > 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RotateCw size={13} />
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}

function SocialLogins() {
  const { t } = useLanguage();
  const [unconfiguredNotice, setUnconfiguredNotice] = useState<string | null>(null);

  const { data: providers } = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: async () => {
      try {
        const res = await api<{
          google?: { configured: boolean };
          facebook?: { configured: boolean };
        }>('/auth/providers');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const googleConfigured = Boolean(providers?.google?.configured);
  const facebookConfigured = Boolean(providers?.facebook?.configured);

  const handleOAuthClick = (e: React.MouseEvent, providerName: 'Google' | 'Facebook', isConfigured: boolean) => {
    if (!isConfigured) {
      e.preventDefault();
      setUnconfiguredNotice(providerName);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          or continue with
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <a
          href="/api/auth/google"
          onClick={(e) => handleOAuthClick(e, 'Google', googleConfigured)}
          className="button button-outline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', textDecoration: 'none' }}
        >
          <GoogleIcon />
          <span>Google</span>
        </a>
        <a
          href="/api/auth/facebook"
          onClick={(e) => handleOAuthClick(e, 'Facebook', facebookConfigured)}
          className="button button-outline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', textDecoration: 'none' }}
        >
          <FacebookIcon />
          <span>Facebook</span>
        </a>
      </div>

      {unconfiguredNotice && (
        <div style={{
          marginTop: '6px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#fbbf24',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={() => setUnconfiguredNotice(null)}
            style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
          <p style={{ margin: 0, fontWeight: 600 }}>{unconfiguredNotice} sign-in is not configured yet.</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
            Requires {unconfiguredNotice === 'Google' ? 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET' : 'FACEBOOK_APP_ID & FACEBOOK_APP_SECRET'} in server environment. Please use <strong>Phone OTP</strong>, <strong>Email</strong>, or <strong>1-Click Demo</strong> above!
          </p>
        </div>
      )}
    </div>
  );
}

function AuthFrame({
  children,
  title,
  description,
  aside = 'Your day does not have to be perfect to be worth planning.',
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  aside?: string;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-glow" />
      <section id="main-content" tabIndex={-1} className="auth-card glass-card">
        <Brand />
        <p className="eyebrow">YOUR DAY, AT YOUR PACE</p>
        <h1>{title}</h1>
        <p className="muted auth-description">{description}</p>
        {children}
        <div className="auth-divider" />
        <p className="auth-aside">
          <Sparkles size={14} />
          {aside}
        </p>
      </section>
      <p className="auth-foot">ನಮ್ಮ ದಿನ · Make today meaningful. Make tomorrow better.</p>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const oauthError = searchParams.get('oauth_error') || searchParams.get('error');

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const res = await api<{ user: { onboardingDone: boolean }; tokens?: AuthTokens }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      if (res.data.tokens) await setAuthTokens(res.data.tokens);
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate(data.user.onboardingDone ? '/app/day' : '/onboarding');
    },
  });

  const demoLogin = useMutation({
    mutationFn: async () => {
      const res = await api<{ user: { onboardingDone: boolean }; tokens?: AuthTokens }>('/auth/demo-login', {
        method: 'POST',
      });
      if (res.data.tokens) await setAuthTokens(res.data.tokens);
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/app/day');
    },
  });

  return (
    <AuthFrame
      title="Welcome back."
      description="Pick up where you left off, or take a breath before you begin."
    >
      {oauthError && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '12px',
          color: '#fbbf24',
          lineHeight: 1.4
        }}>
          {oauthError.includes('google')
            ? '⚠️ Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.'
            : oauthError.includes('facebook')
            ? '⚠️ Facebook Sign-In is not configured yet. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to enable it.'
            : '⚠️ OAuth sign-in could not be completed.'}
          {' '}Please use <strong>Phone OTP</strong> or <strong>1-Click Demo</strong> below.
        </div>
      )}

      {/* 1-Click Instant Demo Login */}
      <button
        type="button"
        onClick={() => demoLogin.mutate()}
        disabled={demoLogin.isPending}
        style={{
          width: '100%',
          padding: '11px 16px',
          marginBottom: '14px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(99, 102, 241, 0.22))',
          border: '1px solid rgba(16, 185, 129, 0.45)',
          borderRadius: '10px',
          color: '#5eead4',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.1)'
        }}
      >
        <Sparkles size={16} />
        <span>{demoLogin.isPending ? 'Entering your space…' : '⚡ 1-Click Demo Access (Skip Setup)'}</span>
      </button>

      <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setMethod('phone')}
          style={{
            flex: 1,
            padding: '7px 0',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: method === 'phone' ? 'rgba(94, 234, 212, 0.15)' : 'transparent',
            color: method === 'phone' ? '#5eead4' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Phone size={14} />
          <span>Phone OTP</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod('email')}
          style={{
            flex: 1,
            padding: '7px 0',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: method === 'email' ? 'rgba(94, 234, 212, 0.15)' : 'transparent',
            color: method === 'email' ? '#5eead4' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={14} />
          <span>Email</span>
        </button>
      </div>

      {method === 'phone' ? (
        <PhoneOtpForm
          onSuccess={(user) => {
            void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            navigate(user.onboardingDone ? '/app/day' : '/onboarding');
          }}
        />
      ) : (
        <form className="form-stack" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
          <AuthInput<LoginValues>
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            register={form.register}
            errors={form.formState.errors}
          />
          <AuthInput<LoginValues>
            label="Password"
            name="password"
            type="password"
            placeholder="Your password"
            register={form.register}
            errors={form.formState.errors}
          />
          <div className="form-row-right">
            <Link to="/forgot-password" className="inline-link">
              Forgot password?
            </Link>
          </div>
          {login.isError && (
            <p className="inline-error">
              {login.error instanceof Error ? login.error.message : 'Could not sign in.'}
            </p>
          )}
          <Button disabled={login.isPending} className="full-width">
            {login.isPending ? 'Finding your space…' : 'Sign in'} <ArrowRight size={16} />
          </Button>
        </form>
      )}

      <SocialLogins />

      <p className="auth-switch" style={{ marginTop: '16px' }}>
        New to Namma Dina? <Link to="/register">Create an account</Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const register = useMutation({
    mutationFn: async (values: RegisterValues) => {
      const res = await api<{ user: { onboardingDone: boolean }; tokens?: AuthTokens }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...values, attribution: getUtmForRegistration() }),
      });
      if (res.data.tokens) await setAuthTokens(res.data.tokens);
      return res.data;
    },
    onSuccess: () => {
      clearUtmForSession();
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/onboarding');
    },
  });

  return (
    <AuthFrame
      title="A space for your day."
      description="A few details to create your personal Namma Dina space."
    >
      <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setMethod('phone')}
          style={{
            flex: 1,
            padding: '7px 0',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: method === 'phone' ? 'rgba(94, 234, 212, 0.15)' : 'transparent',
            color: method === 'phone' ? '#5eead4' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Phone size={14} />
          <span>Phone OTP</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod('email')}
          style={{
            flex: 1,
            padding: '7px 0',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: method === 'email' ? 'rgba(94, 234, 212, 0.15)' : 'transparent',
            color: method === 'email' ? '#5eead4' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={14} />
          <span>Email</span>
        </button>
      </div>

      {method === 'phone' ? (
        <PhoneOtpForm
          onSuccess={() => {
            clearUtmForSession();
            void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            navigate('/onboarding');
          }}
        />
      ) : (
        <form className="form-stack" onSubmit={form.handleSubmit((values) => register.mutate(values))}>
          <AuthInput<RegisterValues>
            label="What should we call you?"
            name="displayName"
            placeholder="Your name"
            register={form.register}
            errors={form.formState.errors}
          />
          <AuthInput<RegisterValues>
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            register={form.register}
            errors={form.formState.errors}
          />
          <AuthInput<RegisterValues>
            label="Create a password"
            name="password"
            type="password"
            placeholder="At least 10 characters"
            register={form.register}
            errors={form.formState.errors}
          />
          <p className="field-hint">Use at least 10 characters. Your private notes stay in your account.</p>
          {register.isError && (
            <p className="inline-error">
              {register.error instanceof Error ? register.error.message : 'Could not create your account.'}
            </p>
          )}
          <Button disabled={register.isPending} className="full-width">
            {register.isPending ? 'Making your space…' : 'Create my space'} <ArrowRight size={16} />
          </Button>
        </form>
      )}

      <SocialLogins />

      <p className="auth-switch" style={{ marginTop: '16px' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const request = useMutation({
    mutationFn: () =>
      api<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }).then((r) => r.data),
    onSuccess: (data) => {
      setSent(true);
      if (data.resetToken) setToken(data.resetToken);
    },
  });

  return (
    <AuthFrame
      title="Let’s find your way in."
      description="Enter your email and we’ll help you choose a new password."
      aside="Reset links expire after 30 minutes."
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          if (!z.string().email().safeParse(email).success) return setError('Enter a valid email address.');
          request.mutate();
        }}
      >
        <Field label="Email address">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        {sent && (
          <div className="success-note">
            <Check size={15} /> If that email exists, password reset instructions are ready.
          </div>
        )}
        {token && (
          <Field label="Local development reset token">
            <TextInput value={token} onChange={(e) => setToken(e.target.value)} />
            <small>Copy this token into the next step. Production email delivery needs a configured sender.</small>
          </Field>
        )}
        {(error || request.isError) && (
          <p className="inline-error">
            {error || (request.error instanceof Error ? request.error.message : 'Could not request a reset.')}
          </p>
        )}
        <Button disabled={request.isPending} className="full-width">
          Send reset instructions <ArrowRight size={16} />
        </Button>
        {token && (
          <Link className="button button-outline full-width" to={`/reset-password?token=${encodeURIComponent(token)}`}>
            Choose a new password <ChevronRight size={15} />
          </Link>
        )}
      </form>
      <p className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthFrame>
  );
}

export function ResetPage() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const reset = useMutation({
    mutationFn: () => sendData('/auth/reset-password', 'POST', { token, password }),
    onSuccess: () => setDone(true),
  });

  return (
    <AuthFrame title="A fresh start." description="Choose a new password for your Namma Dina space.">
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (password.length < 10) return setError('Use at least 10 characters.');
          reset.mutate();
        }}
      >
        <Field label="Reset token">
          <TextInput value={token} onChange={(e) => setToken(e.target.value)} required />
        </Field>
        <div className="field">
          <label htmlFor="reset-password-input">New password</label>
          <span className="password-input-wrap">
            <TextInput
              id="reset-password-input"
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
            />
            <button
              className="password-visibility"
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </div>
        {done ? (
          <div className="success-note">
            <Check size={15} /> Password updated. You can sign in now.
          </div>
        ) : (
          <Button disabled={reset.isPending} className="full-width">
            Save new password <ArrowRight size={16} />
          </Button>
        )}
        {(error || reset.isError) && (
          <p className="inline-error">
            {error || (reset.error instanceof Error ? reset.error.message : 'Could not update your password.')}
          </p>
        )}
        {done && (
          <Link className="button button-primary full-width" to="/login">
            Go to sign in <ArrowRight size={16} />
          </Link>
        )}
      </form>
    </AuthFrame>
  );
}

export { LandingPage } from './LandingPage';
