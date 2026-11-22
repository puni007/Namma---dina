import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type FieldErrors, type Path, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, Check, ChevronRight, Eye, EyeOff, Leaf, Menu, Sparkles, Star, X } from 'lucide-react';
import { api, sendData, setAuthTokens, type AuthTokens } from '../lib/api';
import { clearUtmForSession, getUtmForRegistration } from '../lib/utm';
import { Button, Card, Field, TextInput } from '../components/ui';
import { ScrollReveal } from '../components/ScrollReveal';

const loginSchema = z.object({ email: z.email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });
const registerSchema = z.object({ displayName: z.string().trim().min(1, 'Add your name.').max(60), email: z.email('Enter a valid email address.'), password: z.string().min(10, 'Use at least 10 characters.').max(100) });
type LoginValues = z.infer<typeof loginSchema>; type RegisterValues = z.infer<typeof registerSchema>;

function Brand() { return <Link to="/" className="brand auth-brand"><span className="brand-mark"><span /></span><span><strong>namma dina</strong><small>ನಮ್ಮ ದಿನ · OUR DAY</small></span></Link>; }
function AuthInput<T extends Record<string, string>>({ label, name, register, errors, type = 'text', placeholder }: { label: string; name: Path<T>; register: UseFormRegister<T>; errors: FieldErrors<T>; type?: string; placeholder?: string }) {
  const error = errors[name]?.message as string | undefined;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const inputId = `auth-${String(name)}`;
  const input = <TextInput id={inputId} {...register(name)} type={isPassword && passwordVisible ? 'text' : type} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} />;
  const errorMessage = error && <small id={`${inputId}-error`} className="field-error">{error}</small>;
  if (!isPassword) return <Field label={label}>{input}{errorMessage}</Field>;
  return <div className="field"><label htmlFor={inputId}>{label}</label><span className="password-input-wrap">{input}<button className="password-visibility" type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errorMessage}</div>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="landing"><div className="aurora-orb orb-one"/><div className="aurora-orb orb-two"/><header className="landing-header"><Brand/><button className="landing-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button><nav id="landing-navigation" className={menuOpen ? 'menu-open' : ''}><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link><Link to="/register" onClick={() => setMenuOpen(false)} className="button button-primary header-cta">Start your day <ArrowRight size={15}/></Link></nav></header>
    <main id="main-content" tabIndex={-1}><section className="hero"><div className="hero-copy"><div className="hero-tag"><span className="pulse-dot"/> A gentler way to plan your day</div><h1>Make today<br/><span>meaningful.</span></h1><p className="hero-tomorrow">Make tomorrow better.</p><p className="hero-description">A thoughtful space for your plans, habits and wellbeing. When a day goes sideways, find your way back without the guilt.</p><div className="hero-actions"><Link className="button button-primary hero-button" to="/register">Create your free space <ArrowRight size={16}/></Link><a href="#how-it-works" className="text-button">Explore the rhythm <ArrowDownRight size={16}/></a></div><div className="hero-proof"><div className="proof-avatars"><span>ಸ</span><span>日</span><span>✦</span></div><span>Small steps. Your pace. Always yours.</span></div></div>
      <div className="hero-visual"><div className="visual-glow"/><Card className="preview-card"><div className="preview-top"><div><p className="eyebrow">MY DAY</p><h2>A little room to begin.</h2></div><div className="weather-mark"><Sparkles size={17}/></div></div><div className="preview-progress"><div className="ring ring-empty"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="39"/><circle className="ring-value" cx="48" cy="48" r="39"/></svg><span>—</span></div><div><strong>Your day, your way</strong><p className="muted">A clear place for today.</p></div></div><div className="preview-list"><div className="preview-row preview-empty-row"><span className="check-circle"/><span>Tasks you choose</span></div><div className="preview-row preview-empty-row"><span className="check-circle"/><span>Habits that can flex with life</span></div></div><div className="preview-nudge"><span><Sparkles size={14}/></span><p>There is always room to begin again.</p></div></Card><div className="float-note"><span className="float-icon"><Leaf size={15}/></span><span><small>GENTLE COMEBACK</small><strong>Start where you are</strong></span></div><div className="float-bubble">ಒಂದು ದಿನ<br/><strong>one step</strong><br/>at a time</div></div>
      </section>
      <ScrollReveal className="landing-values" id="how-it-works"><div><span className="value-no">01</span><h3>Plan with breathing room</h3><p>Shape the day around what matters, leaving room for life to happen.</p></div><div><span className="value-no">02</span><h3>Notice the patterns</h3><p>See how your time and energy move, with insights based on your own entries.</p></div><div><span className="value-no">03</span><h3>Come back gently</h3><p>Missed a plan? Get a useful next step, never a lecture about your streak.</p></div></ScrollReveal>
      <section className="faq-section" id="faq"><div className="faq-heading"><p className="eyebrow">QUICK ANSWERS</p><h2>A few things you may be wondering.</h2></div><div className="faq-list">
        <details><summary>Can I use Namma Dina in Kannada?</summary><p>Yes. You can switch between English and ಕನ್ನಡ from the app navigation.</p></details>
        <details><summary>What can I keep track of?</summary><p>Plan tasks, make flexible habit check-ins, organize your schedule, and reflect on parts of your wellbeing.</p></details>
        <details><summary>Do I have to use the AI companion?</summary><p>No. The companion is optional, and you can manage its settings from your account.</p></details>
        <details><summary>Can the companion change my plans?</summary><p>It asks you to review and confirm a proposed change before saving it.</p></details>
      </div></section>
      <ScrollReveal className="landing-closer"><div className="closer-spark"><Star size={18}/></div><div><h2>Every day is a new page.</h2><p>Your day management space, in English and ಕನ್ನಡ.</p></div><Link className="button button-outline" to="/register">Find your rhythm <ChevronRight size={16}/></Link></ScrollReveal></main><footer className="landing-footer"><Brand/><nav aria-label="Footer"><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><Link to="/login">Sign in</Link><Link to="/register">Create an account</Link><a href="mailto:nammadinna.support@gmail.com">Email support</a></nav><div className="landing-footer-meta"><span>© {new Date().getFullYear()} Namma Dina</span><span><time dateTime="2026-11-20">Updated 20 November 2026</time></span><span>ನಮ್ಮ ದಿನ · OUR DAY</span></div></footer></div>;
}

function AuthFrame({ children, title, description, aside = 'Your day does not have to be perfect to be worth planning.' }: { children: React.ReactNode; title: string; description: string; aside?: string }) { return <div className="auth-layout"><div className="auth-glow"/><section id="main-content" tabIndex={-1} className="auth-card glass-card"><Brand/><p className="eyebrow">YOUR DAY, AT YOUR PACE</p><h1>{title}</h1><p className="muted auth-description">{description}</p>{children}<div className="auth-divider"/><p className="auth-aside"><Sparkles size={14}/>{aside}</p></section><p className="auth-foot">ನಮ್ಮ ದಿನ · Make today meaningful. Make tomorrow better.</p></div>; }

export function LoginPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
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
  return <AuthFrame title="Welcome back." description="Pick up where you left off, or take a breath before you begin."><form className="form-stack" onSubmit={form.handleSubmit((values) => login.mutate(values))}><AuthInput<LoginValues> label="Email address" name="email" type="email" placeholder="you@example.com" register={form.register} errors={form.formState.errors}/><AuthInput<LoginValues> label="Password" name="password" type="password" placeholder="Your password" register={form.register} errors={form.formState.errors}/><div className="form-row-right"><Link to="/forgot-password" className="inline-link">Forgot password?</Link></div>{login.isError && <p className="inline-error">{login.error instanceof Error ? login.error.message : 'Could not sign in.'}</p>}<Button disabled={login.isPending} className="full-width">{login.isPending ? 'Finding your space…' : 'Sign in'} <ArrowRight size={16}/></Button></form><p className="auth-switch">New to Namma Dina? <Link to="/register">Create an account</Link></p></AuthFrame>;
}

export function RegisterPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { displayName: '', email: '', password: '' } });
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
  return <AuthFrame title="A space for your day." description="A few details to create your personal Namma Dina space."><form className="form-stack" onSubmit={form.handleSubmit((values) => register.mutate(values))}><AuthInput<RegisterValues> label="What should we call you?" name="displayName" placeholder="Your name" register={form.register} errors={form.formState.errors}/><AuthInput<RegisterValues> label="Email address" name="email" type="email" placeholder="you@example.com" register={form.register} errors={form.formState.errors}/><AuthInput<RegisterValues> label="Create a password" name="password" type="password" placeholder="At least 10 characters" register={form.register} errors={form.formState.errors}/><p className="field-hint">Use at least 10 characters. Your private notes stay in your account.</p>{register.isError && <p className="inline-error">{register.error instanceof Error ? register.error.message : 'Could not create your account.'}</p>}<Button disabled={register.isPending} className="full-width">{register.isPending ? 'Making your space…' : 'Create my space'} <ArrowRight size={16}/></Button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></AuthFrame>;
}

export function ForgotPage() {
  const [email, setEmail] = useState(''); const [token, setToken] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  const request = useMutation({ mutationFn: () => api<{ message: string; resetToken?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }).then((r) => r.data), onSuccess: (data) => { setSent(true); if (data.resetToken) setToken(data.resetToken); } });
  return <AuthFrame title="Let’s find your way in." description="Enter your email and we’ll help you choose a new password." aside="Reset links expire after 30 minutes."><form className="form-stack" onSubmit={(e) => { e.preventDefault(); setError(''); if (!z.email().safeParse(email).success) return setError('Enter a valid email address.'); request.mutate(); }}><Field label="Email address"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>{sent && <div className="success-note"><Check size={15}/> If that email exists, password reset instructions are ready.</div>}{token && <Field label="Local development reset token"><TextInput value={token} onChange={(e) => setToken(e.target.value)} /><small>Copy this token into the next step. Production email delivery needs a configured sender.</small></Field>}{(error || request.isError) && <p className="inline-error">{error || (request.error instanceof Error ? request.error.message : 'Could not request a reset.')}</p>}<Button disabled={request.isPending} className="full-width">Send reset instructions <ArrowRight size={16}/></Button>{token && <Link className="button button-outline full-width" to={`/reset-password?token=${encodeURIComponent(token)}`}>Choose a new password <ChevronRight size={15}/></Link>}</form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></AuthFrame>;
}

export function ResetPage() {
  const [params] = useSearchParams(); const [token, setToken] = useState(params.get('token') ?? ''); const [password, setPassword] = useState(''); const [passwordVisible, setPasswordVisible] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const reset = useMutation({ mutationFn: () => sendData('/auth/reset-password', 'POST', { token, password }), onSuccess: () => setDone(true) });
  return <AuthFrame title="A fresh start." description="Choose a new password for your Namma Dina space."><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setError(''); if (password.length < 10) return setError('Use at least 10 characters.'); reset.mutate(); }}><Field label="Reset token"><TextInput value={token} onChange={(e) => setToken(e.target.value)} required /></Field><div className="field"><label htmlFor="reset-password-input">New password</label><span className="password-input-wrap"><TextInput id="reset-password-input" type={passwordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} /><button className="password-visibility" type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></div>{done ? <div className="success-note"><Check size={15}/> Password updated. You can sign in now.</div> : <Button disabled={reset.isPending} className="full-width">Save new password <ArrowRight size={16}/></Button>}{(error || reset.isError) && <p className="inline-error">{error || (reset.error instanceof Error ? reset.error.message : 'Could not update your password.')}</p>}{done && <Link className="button button-primary full-width" to="/login">Go to sign in <ArrowRight size={16}/></Link>}</form></AuthFrame>;
}
