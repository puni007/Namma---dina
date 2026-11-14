import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, ShieldCheck, Trash2, Bell, Check, AlertCircle, Upload } from 'lucide-react';
import { getData, sendData, type User } from '../lib/api';
import { Button, Card, ConfirmDialog, EmptyState, Field, Loading, Modal, PageHeading, RatingSelect, SelectInput, TextArea, TextInput } from '../components/ui';
import { formatDateTime, money } from '../lib/format';
import { dateTimeFromLocal, dateTimeLocalInput } from '../lib/format';
import { useAIStatus } from '../lib/useAIStatus';
import { MitraSettings } from '../components/MitraSettings';

export type FormField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime-local' | 'time' | 'textarea' | 'select' | 'checkbox' | 'rating';
  options?: string[];
  optional?: boolean;
  defaultValue?: string;
  hint?: string;
  multiplier?: number;
  inputDivisor?: number;
  ratingLabels?: string[];
};
export type Column = { key: string; label: string; suffix?: string; currency?: boolean; time?: boolean };
type Row = { id: string; [key: string]: unknown };

function decodeVapidKey(encoded: string) {
  const padded = `${encoded}${'='.repeat((4 - encoded.length % 4) % 4)}`;
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function inputValue(field: FormField, value: unknown) {
  if (value == null || value === '') return field.defaultValue ?? '';
  if (field.type === 'checkbox') return value ? 'true' : 'false';
  if (field.type === 'number' && field.inputDivisor) return String(Number(value) / field.inputDivisor);
  if (field.type === 'datetime-local' && typeof value === 'string') return dateTimeLocalInput(value);
  if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10);
  return String(value);
}

function payloadValue(field: FormField, value: string) {
  if (value === '' && field.optional) return undefined;
  if (value === '' && !field.optional) return undefined;
  if (field.type === 'number' || field.type === 'rating') return value === '' ? undefined : Number(value) * (field.multiplier ?? 1);
  if (field.type === 'checkbox') return value === 'true';
  if (field.type === 'datetime-local') return value ? dateTimeFromLocal(value).toISOString() : undefined;
  return value;
}

function Editor({ title, fields, initial = {}, onClose, onSave, saving }: { title: string; fields: FormField[]; initial?: Record<string, unknown>; onClose: () => void; onSave: (values: Record<string, unknown>) => void; saving: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, inputValue(field, initial[field.key])])));
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const body = Object.fromEntries(fields.map((field) => [field.key, payloadValue(field, values[field.key] ?? '')]).filter(([, value]) => value !== undefined));
    const missing = fields.find((field) => !field.optional && !(body[field.key] !== '' && body[field.key] != null));
    if (missing) { setError(`${missing.label} is required.`); return; }
    onSave(body);
  }
  return <Modal title={title} onClose={onClose}><form className="form-stack editor-form" onSubmit={submit}>{fields.map((field) => <Field key={field.key} label={field.label} hint={field.hint}>{field.type === 'textarea' ? <TextArea value={values[field.key] ?? ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} placeholder={field.optional ? 'Add a note…' : ''} /> : field.type === 'select' ? <SelectInput value={values[field.key] ?? field.options?.[0] ?? ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>{field.options?.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</SelectInput> : field.type === 'checkbox' ? <input type="checkbox" checked={values[field.key] === 'true'} onChange={(e) => setValues({ ...values, [field.key]: String(e.target.checked) })}/> : field.type === 'rating' ? <RatingSelect value={Number(values[field.key]) || null} onChange={(num) => setValues({ ...values, [field.key]: String(num) })} labels={field.ratingLabels} /> : <TextInput type={field.type} value={values[field.key] ?? ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} placeholder={field.type === 'text' ? 'Write a little…' : undefined} />}</Field>)}{error && <p className="inline-error"><AlertCircle size={15} />{error}</p>}<div className="modal-actions"><Button type="button" variant="quiet" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div></form></Modal>;
}

function cell(row: Row, column: Column) {
  const value = row[column.key];
  if (value == null || value === '') return <span className="muted">—</span>;
  if (column.currency) return money(Number(value));
  if (column.time) return formatDateTime(String(value));
  if (typeof value === 'string' && value.length > 70) return `${value.slice(0, 68)}…`;
  if (typeof value === 'string') return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${String(value)}${column.suffix ?? ''}`;
}

export function ResourcePage({ path, title, eyebrow, subtitle, fields, columns, note, onSaved }: { path: string; title: string; eyebrow?: string; subtitle?: string; fields: FormField[]; columns: Column[]; note?: string; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const key = ['resource', path, query];
  const rows = useQuery({ queryKey: key, queryFn: () => getData<Row[]>(`${path}?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`) });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['resource', path] }); onSaved?.(); };
  const save = useMutation({ mutationFn: (values: Record<string, unknown>) => editing?.id ? sendData(`${path}/${editing.id}`, 'PATCH', values) : sendData(path, 'POST', values), onSuccess: () => { setEditing(undefined); refresh(); } });
  const remove = useMutation({ mutationFn: (id: string) => sendData(`${path}/${id}`, 'DELETE'), onSuccess: () => { setDeletingId(null); refresh(); } });
  const markRead = useMutation({ mutationFn: (id: string) => sendData(`${path}/${id}`, 'PATCH', { readAt: new Date().toISOString() }), onSuccess: refresh });
  const data = rows.data ?? [];
  return <><PageHeading eyebrow={eyebrow} title={title} subtitle={subtitle} action={<Button onClick={() => setEditing(null)}><Plus size={16} /> Add entry</Button>} />
    {note && <div className="soft-note"><ShieldCheck size={17} /><span>{note}</span></div>}
    <Card className="resource-card"><div className="resource-toolbar"><div><h2>Your entries</h2><p className="muted">{rows.isLoading ? 'Gathering your records…' : `${data.length} ${data.length === 1 ? 'entry' : 'entries'} shown`}</p></div><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your records…" aria-label="Search records" /></div>
      {rows.isLoading ? <Loading /> : rows.isError ? <div className="error-state"><AlertCircle size={18} />We couldn’t load this section. Try again in a moment.</div> : !data.length ? <EmptyState title="A little space to begin" body="Add your first entry whenever it feels useful. You can change or remove it later." action={<Button variant="outline" onClick={() => setEditing(null)}><Plus size={15} /> Add an entry</Button>} /> : <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-cell">Manage</th></tr></thead><tbody>{data.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{cell(row, column)}</td>)}<td className="actions-cell">{path === '/notifications' && !row.readAt && <button className="icon-button" aria-label="Mark notification as read" title="Mark read" onClick={() => markRead.mutate(row.id)}><Check size={15}/></button>}<button className="icon-button" aria-label={`Edit ${String(columns[0] ? row[columns[0].key] ?? 'record' : 'record')}`} onClick={() => setEditing(row)}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label="Delete entry" onClick={() => setDeletingId(row.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
      {remove.isError && <p className="inline-error">This entry could not be deleted. Please try again.</p>}
    </Card>
    {editing !== undefined && <Editor title={editing ? 'Make a change' : 'Add an entry'} fields={fields} initial={editing ?? {}} saving={save.isPending} onClose={() => setEditing(undefined)} onSave={(values) => save.mutate(values)} />}
    {save.isError && <div className="toast-error"><AlertCircle size={16} />{save.error instanceof Error ? save.error.message : 'Could not save this entry.'}</div>}
    <ConfirmDialog
      isOpen={deletingId !== null}
      title="Delete entry?"
      message="Are you sure you want to delete this entry? This action cannot be undone."
      confirmLabel="Delete entry"
      onConfirm={() => { if (deletingId) remove.mutate(deletingId); }}
      onCancel={() => setDeletingId(null)}
    />
  </>;
}

export function NotificationsPage() {
  return <ResourcePage path="/notifications" title="Notifications" eyebrow="GENTLE REMINDERS" subtitle="In-app reminders and browser notifications you’ve chosen to receive." fields={[{ key: 'title', label: 'Title', type: 'text' }, { key: 'body', label: 'Message', type: 'textarea' }, { key: 'kind', label: 'Type', type: 'select', options: ['reminder', 'insight', 'system'], optional: true }]} columns={[{ key: 'title', label: 'Notification' }, { key: 'body', label: 'Message' }, { key: 'kind', label: 'Type' }, { key: 'createdAt', label: 'Received', time: true }, { key: 'readAt', label: 'Read', time: true }]} />;
}

export function RemindersPage() {
  return (
    <ResourcePage
      path="/reminders"
      title="Reminders"
      eyebrow="A GENTLE NUDGE, WHEN IT HELPS"
      subtitle="Set reminders for the moments you want to come back to."
      fields={[
        { key: 'title', label: 'Reminder', type: 'text' },
        { key: 'body', label: 'A little note (optional)', type: 'textarea', optional: true },
        { key: 'dueAt', label: 'When', type: 'datetime-local' },
        { key: 'recurrence', label: 'Repeat', type: 'select', options: ['No repeat', 'DAILY', 'WEEKLY', 'MONTHLY'], optional: true },
      ]}
      columns={[
        { key: 'title', label: 'Reminder' },
        { key: 'body', label: 'Note' },
        { key: 'dueAt', label: 'Due', time: true },
        { key: 'state', label: 'State' },
      ]}
      note="The server checks reminders in the background. Browser notices work while the app is open; Web Push can reach you when it’s closed after VAPID keys are configured."
    />
  );
}

export function CategoriesPage() {
  return (
    <ResourcePage
      path="/categories"
      title="Task categories"
      eyebrow="ADD A LITTLE SHAPE"
      subtitle="Group tasks around work, people, or whatever matters to you."
      fields={[
        { key: 'name', label: 'Category name', type: 'text' },
        { key: 'color', label: 'Aurora color', type: 'text', defaultValue: '#67E8D0', hint: 'Hex color, such as #67E8D0' },
      ]}
      columns={[
        { key: 'name', label: 'Category' },
        { key: 'color', label: 'Color' },
      ]}
    />
  );
}

export function DigitalPage() {
  return (
    <ResourcePage
      path="/screen-time"
      title="Digital wellbeing"
      eyebrow="NOTICE YOUR RHYTHMS"
      subtitle="Manual entries keep your screen time visible without pretending a browser can read other apps."
      fields={[
        { key: 'date', label: 'Day', type: 'date', defaultValue: dateTimeLocalInput(new Date()).slice(0, 10) },
        { key: 'category', label: 'Category', type: 'select', options: ['Work', 'Social', 'Entertainment', 'Learning', 'Other'] },
        { key: 'appName', label: 'App or context', type: 'text', optional: true },
        { key: 'minutes', label: 'Minutes', type: 'number' },
        { key: 'distractionCount', label: 'Distractions', type: 'number', optional: true },
      ]}
      columns={[
        { key: 'date', label: 'Day' },
        { key: 'category', label: 'Category' },
        { key: 'appName', label: 'App' },
        { key: 'minutes', label: 'Time', suffix: ' min' },
        { key: 'distractionCount', label: 'Distractions' },
      ]}
    />
  );
}

export function FoodPage() {
  return (
    <ResourcePage
      path="/food"
      title="Food & spending"
      eyebrow="AWARENESS WITHOUT GUILT"
      subtitle="Keep a kind, practical record of meals and food spending."
      fields={[
        { key: 'name', label: 'Meal or order', type: 'text' },
        { key: 'kind', label: 'Made or ordered', type: 'select', options: ['HOME', 'COOKED_OUTSIDE', 'DELIVERY'] },
        { key: 'spendCents', label: 'Spend (₹)', type: 'number', multiplier: 100, inputDivisor: 100, hint: 'Enter rupees; a free home meal is 0.' },
        { key: 'loggedAt', label: 'When', type: 'datetime-local', optional: true },
        { key: 'notes', label: 'Notes', type: 'textarea', optional: true },
      ]}
      columns={[
        { key: 'name', label: 'Meal' },
        { key: 'kind', label: 'Type' },
        { key: 'spendCents', label: 'Spend', currency: true },
        { key: 'loggedAt', label: 'When', time: true },
      ]}
    />
  );
}

export function ReflectionPage() {
  return (
    <ResourcePage
      path="/reflections"
      title="Daily reflection"
      eyebrow="CLOSE THE DAY GENTLY"
      subtitle="A private place to notice what helped, what got in the way, and what matters next."
      fields={[
        { key: 'date', label: 'Day', type: 'date', defaultValue: dateTimeLocalInput(new Date()).slice(0, 10) },
        { key: 'wentWell', label: 'What went well today?', type: 'textarea', optional: true },
        { key: 'offPlan', label: 'What didn’t go to plan?', type: 'textarea', optional: true },
        { key: 'distractions', label: 'What distracted me?', type: 'textarea', optional: true },
        { key: 'gratitude', label: 'What am I grateful for?', type: 'textarea', optional: true },
        { key: 'improve', label: 'One thing to try tomorrow', type: 'textarea', optional: true },
        { key: 'mood', label: 'Mood (1–5)', type: 'rating', ratingLabels: ['Low', 'Slightly low', 'Neutral', 'Good', 'Radiant'], optional: true },
      ]}
      columns={[
        { key: 'date', label: 'Day' },
        { key: 'wentWell', label: 'Went well' },
        { key: 'mood', label: 'Mood' },
      ]}
    />
  );
}

export function SettingsPage({ user }: { user: User }) {
  const queryClient = useQueryClient(); const settings = useQuery({ queryKey: ['settings'], queryFn: () => getData<Record<string, unknown>>('/users/settings') }); const aiStatus = useAIStatus();
  const [displayName, setDisplayName] = useState(user.displayName); const [timezone, setTimezone] = useState(user.timezone); const [wakeTime, setWakeTime] = useState('07:00'); const [sleepTime, setSleepTime] = useState('23:00'); const [water, setWater] = useState('2000'); const [screen, setScreen] = useState('180'); const [budget, setBudget] = useState('0'); const [goal, setGoal] = useState(''); const [motionMode, setMotionMode] = useState('auto'); const [saved, setSaved] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false); const [aiFeatures, setAiFeatures] = useState({ aiMorningBriefingEnabled: false, aiQuickAddEnabled: false, aiComebackPlanEnabled: false, aiWeeklyReflectionEnabled: false }); const [confirmDeleteAI, setConfirmDeleteAI] = useState(false);
  useEffect(() => { if (settings.data) { setWakeTime(String(settings.data.wakeTime)); setSleepTime(String(settings.data.sleepTime)); setWater(String(settings.data.dailyWaterGoalMl)); setScreen(String(settings.data.dailyScreenGoalMinutes)); setBudget(String(Number(settings.data.monthlyFoodBudgetCents) / 100)); setGoal(Array.isArray(settings.data.goals) ? String(settings.data.goals[0] ?? '') : ''); setMotionMode(String(settings.data.motionMode ?? 'auto')); setAiEnabled(settings.data.aiCompanionEnabled === true); setAiFeatures({ aiMorningBriefingEnabled: settings.data.aiMorningBriefingEnabled === true, aiQuickAddEnabled: settings.data.aiQuickAddEnabled === true, aiComebackPlanEnabled: settings.data.aiComebackPlanEnabled === true, aiWeeklyReflectionEnabled: settings.data.aiWeeklyReflectionEnabled === true }); } }, [settings.data]);
  const save = useMutation({ mutationFn: async () => { await sendData('/users/profile', 'PATCH', { displayName, timezone }); await sendData('/users/settings', 'PATCH', { wakeTime, sleepTime, dailyWaterGoalMl: Number(water), dailyScreenGoalMinutes: Number(screen), monthlyFoodBudgetCents: Math.round(Number(budget) * 100), goals: goal ? [goal] : [], motionMode, aiCompanionEnabled: aiEnabled, ...aiFeatures }); }, onSuccess: () => { setSaved(true); void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }); void queryClient.invalidateQueries({ queryKey: ['settings'] }); void queryClient.invalidateQueries({ queryKey: ['ai-status'] }); setTimeout(() => setSaved(false), 2800); } });
  const deleteAIData = useMutation({ mutationFn: () => sendData('/ai/data', 'DELETE'), onSuccess: () => { setConfirmDeleteAI(false); setAiEnabled(false); setAiFeatures({ aiMorningBriefingEnabled: false, aiQuickAddEnabled: false, aiComebackPlanEnabled: false, aiWeeklyReflectionEnabled: false }); void queryClient.invalidateQueries({ queryKey: ['settings'] }); void queryClient.invalidateQueries({ queryKey: ['ai-status'] }); } });
  const notification = useMutation({ mutationFn: async () => {
    const enabled = settings.data?.browserNotifications === true;
    if (enabled) {
      if ('serviceWorker' in navigator) { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); if (subscription) { await sendData('/push/subscriptions', 'DELETE', { endpoint: subscription.endpoint }); await subscription.unsubscribe(); } }
      await sendData('/users/settings', 'PATCH', { browserNotifications: false });
      return 'disabled';
    }
    if (!('Notification' in window)) throw new Error('This browser does not support notifications.');
    const permission = await Notification.requestPermission();
    let pushEnabled = false;
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      const { publicKey } = await getData<{ publicKey: string | null }>('/push/key');
      if (publicKey) {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
        await sendData('/push/subscriptions', 'POST', subscription.toJSON()); pushEnabled = true;
      }
    }
    await sendData('/users/settings', 'PATCH', { browserNotifications: permission === 'granted' });
    return permission === 'granted' ? (pushEnabled ? 'enabled-push' : 'enabled-local') : 'denied';
  }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['settings'] }); void queryClient.invalidateQueries({ queryKey: ['push-status'] }); } });
  if (settings.isLoading) return <Loading />;
  return <><PageHeading eyebrow="MAKE IT YOURS" title="Settings" subtitle="Set a few gentle boundaries and preferences for your day." action={<Button onClick={() => save.mutate()} disabled={save.isPending}>{saved ? <><Check size={16} /> Saved</> : 'Save changes'}</Button>} />
    <div className="settings-grid"><Card><div className="section-head"><div><h2>Your profile</h2><p className="muted">These choices stay in your account.</p></div></div><div className="form-grid"><Field label="Name"><TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field><Field label="Email"><TextInput value={user.email} disabled /></Field><Field label="Timezone"><TextInput value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" /></Field><Field label="One personal goal"><TextInput value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What would you like more room for?" /></Field><Field label="Usual start"><TextInput type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field><Field label="Usual wind-down"><TextInput type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} /></Field></div></Card>
      <Card><div className="section-head"><div><h2>Personal goals</h2><p className="muted">You choose what a comfortable target looks like.</p></div></div><div className="form-grid"><Field label="Daily water target (ml)"><TextInput type="number" min="100" max="10000" value={water} onChange={(e) => setWater(e.target.value)} /></Field><Field label="Daily screen-time goal (minutes)"><TextInput type="number" min="15" max="1440" value={screen} onChange={(e) => setScreen(e.target.value)} /></Field><Field label="Monthly food budget (₹)" hint="This is just for awareness, not a limit."><TextInput type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field></div></Card>
      <Card><div className="section-head"><div><h2>Motion & effects</h2><p className="muted">Keep movement gentle and comfortable.</p></div></div><Field label="Motion preference" hint="Automatic follows your device. Reduced motion in your system settings always turns effects off."><SelectInput value={motionMode} onChange={(event) => setMotionMode(event.target.value)}><option value="auto">Automatic (recommended)</option><option value="full">Full</option><option value="calm">Calm</option><option value="off">Off</option></SelectInput></Field></Card>
      <MitraSettings/>
      {(aiStatus.data?.available || aiStatus.data?.dataPresent) && <Card className="ai-settings-card"><div className="section-head"><div><h2>AI companion</h2><p className="muted">Optional, off by default. Nothing is sent until you use an enabled feature.</p></div></div>{aiStatus.data.available ? <><label className="check-row"><input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)}/><span><strong>Enable AI companion</strong><small>Each feature below also has its own switch.</small></span></label><p className="ai-consent-copy">When you use a feature, the app sends only the details needed for that request to Anthropic. Morning briefing sends today’s task titles and status, habit names and completion, today’s water total, and your latest sleep duration. Quick add sends the text you enter and your language. Comeback plan sends suggested task titles, reasons and proposed times. Weekly reflection sends the last seven days of reflection fields, moods and sleep durations. Your name, email, password and account tokens are never sent. Requests have a daily limit; prompts and responses are not stored.</p><div className="ai-feature-toggles">{([
        ['aiMorningBriefingEnabled', 'Morning briefing', 'Today’s tasks, habits, water and latest sleep duration.', 'morningBriefing'],
        ['aiQuickAddEnabled', 'Quick add', 'Only the text you enter and your selected language.', 'quickAdd'],
        ['aiComebackPlanEnabled', 'Comeback plan', 'Titles and proposed times from your deterministic suggestions.', 'comebackPlan'],
        ['aiWeeklyReflectionEnabled', 'Weekly reflection', 'Reflection fields, moods and sleep durations from seven days.', 'weeklyReflection'],
      ] as const).filter(([, , , feature]) => aiStatus.data.featuresAvailable[feature]).map(([key, label, hint]) => <label className="check-row" key={key}><input type="checkbox" checked={aiFeatures[key]} disabled={!aiEnabled} onChange={(event) => setAiFeatures((current) => ({ ...current, [key]: event.target.checked }))}/><span><strong>{label}</strong><small>{hint}</small></span></label>)}</div><p className="muted">A daily limit of {aiStatus.data.dailyQuota} successful requests applies per account. Provider calls stay on the server, use a timeout, and can be disabled here at any time.</p></> : <p className="muted">AI companion is not currently configured. You can still delete its stored token counts.</p>}{aiStatus.data.dataPresent && <Button variant="danger" onClick={() => setConfirmDeleteAI(true)} disabled={deleteAIData.isPending}>Delete my AI data</Button>}{deleteAIData.isError && <p className="inline-error">{deleteAIData.error instanceof Error ? deleteAIData.error.message : 'Could not delete AI data.'}</p>}</Card>}
      <Card className="notification-settings"><div><div className="setting-icon"><Bell size={18} /></div><h2>Browser reminders</h2><p className="muted">Show a gentle notification when one of your reminders is due. Configure Web Push keys on the server to receive them while the app is closed.</p>{notification.isSuccess && <p className="notification-result">{notification.data === 'disabled' ? 'Browser reminders are off.' : notification.data === 'enabled-push' ? 'Browser reminders and Web Push are enabled.' : notification.data === 'enabled-local' ? 'Browser reminders are enabled while the app is open.' : 'Your browser did not grant notification permission.'}</p>}{notification.isError && <p className="inline-error">{notification.error instanceof Error ? notification.error.message : 'Could not change notification settings.'}</p>}</div><Button variant="outline" onClick={() => notification.mutate()} disabled={notification.isPending}>{notification.isPending ? 'Updating…' : settings.data?.browserNotifications === true ? 'Turn off browser reminders' : 'Enable browser notifications'}</Button></Card>
      <Card className="privacy-card"><div className="setting-icon"><ShieldCheck size={18} /></div><div><h2>Privacy & account</h2><p className="muted">Export a copy of your information, or permanently delete your account and its data.</p><a className="inline-link" href="/api/users/export" target="_blank" rel="noreferrer"><Download size={15} /> Download my data</a></div><a className="button button-outline" href="/app/account">Account & privacy</a></Card>
    </div>{save.isError && <p className="inline-error">{save.error instanceof Error ? save.error.message : 'Could not save your settings.'}</p>}<ConfirmDialog isOpen={confirmDeleteAI} title="Delete AI data?" message="This permanently removes stored AI usage counts and turns off every AI companion setting. Prompts and responses are not stored." confirmLabel="Delete AI data" onCancel={() => setConfirmDeleteAI(false)} onConfirm={() => deleteAIData.mutate()} />
  </>;
}

export function AccountPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => sendData('/users/account', 'DELETE', { password }),
    onSuccess: () => { queryClient.clear(); window.location.assign('/'); },
  });

  const importMutation = useMutation({
    mutationFn: async (jsonText: string) => {
      const parsed = JSON.parse(jsonText);
      return sendData<{ success: boolean; importedTasks: number; importedHabits: number; importedReminders: number }>(
        '/users/import',
        'POST',
        parsed
      );
    },
    onSuccess: (res) => {
      setImportStatus(`Successfully restored ${res.importedTasks} tasks, ${res.importedHabits} habits, and ${res.importedReminders} reminders.`);
      void queryClient.invalidateQueries();
    },
    onError: (err) => {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Invalid backup file'}`);
    },
  });

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) importMutation.mutate(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const doDelete = () => {
    setError('');
    if (!password) return setError('Enter your password to continue.');
    if (password !== confirm) return setError('Those passwords do not match.');
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <PageHeading eyebrow="YOUR DATA, YOUR CHOICE" title="Account & privacy" subtitle="Take a copy of your data, restore a backup, or close your account." />
      <div className="settings-grid">
        <Card>
          <div className="section-head">
            <div className="setting-icon"><Download size={18} /></div>
            <div>
              <h2>Backup & Restore</h2>
              <p className="muted">Export your records as JSON, or restore a previously saved backup.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
            <a className="button button-outline" href="/api/users/export" target="_blank" rel="noreferrer">
              <Download size={15} /> Download export
            </a>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={onFileSelected}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <Upload size={15} /> {importMutation.isPending ? 'Importing…' : 'Restore from backup'}
            </Button>
          </div>
          {importStatus && (
            <p style={{ marginTop: '14px', fontSize: '13px', color: importStatus.startsWith('Import failed') ? '#ff9cae' : '#67e8d0' }}>
              {importStatus}
            </p>
          )}
        </Card>

        <Card className="danger-zone">
          <div className="setting-icon danger-setting"><Trash2 size={18} /></div>
          <h2>Delete your account</h2>
          <p className="muted">This permanently deletes your account and all records associated with it.</p>
          <div className="form-grid">
            <Field label="Current password"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <Field label="Type the password again"><TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          </div>
          <Button variant="danger" onClick={doDelete} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Permanently delete account'}
          </Button>
          {error && <p className="inline-error">{error}</p>}
          {remove.isError && <p className="inline-error">{remove.error instanceof Error ? remove.error.message : 'Could not delete this account.'}</p>}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Permanently delete account?"
        message="This will immediately delete your account and all associated tasks, habits, wellness logs, and history. This action cannot be undone."
        confirmLabel="Yes, delete my account"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          remove.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
