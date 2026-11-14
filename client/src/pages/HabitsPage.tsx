import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowUpRight, Check, Leaf, Plus, Sparkles, Target } from 'lucide-react';
import { getData, sendData, type Habit } from '../lib/api';
import { todayKey } from '../lib/format';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Loading, Modal, PageHeading, SelectInput, TextArea, TextInput, ProgressBar } from '../components/ui';

type HabitLog = { id: string; habitId: string; date: string; value: number; note?: string | null };
type HabitInput = Partial<Habit> & { description?: string | null; daysOfWeek?: number[]; frequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM'; startDate?: string };
const weekKey = (value: Date) => { const day = new Date(`${todayKey(value)}T00:00:00.000Z`); const offset = (day.getUTCDay() + 6) % 7; day.setUTCDate(day.getUTCDate() - offset); return day.toISOString().slice(0, 10); };

export function HabitsPage() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<HabitInput | null | undefined>(undefined);
  const [archivingHabit, setArchivingHabit] = useState<Habit | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const date = todayKey();
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => getData<Habit[]>('/habits?limit=100') });
  const logs = useQuery({ queryKey: ['habit-logs', date], queryFn: () => getData<HabitLog[]>(`/habit-logs?from=${weekKey(new Date())}&to=${date}&limit=100`) });
  const refresh = () => { void client.invalidateQueries({ queryKey: ['habits'] }); void client.invalidateQueries({ queryKey: ['habit-logs'] }); void client.invalidateQueries({ queryKey: ['overview'] }); };
  const save = useMutation({ mutationFn: (habit: HabitInput) => habit.id ? sendData(`/habits/${habit.id}`, 'PATCH', habit) : sendData('/habits', 'POST', habit), onSuccess: () => { setEditing(undefined); refresh(); } });
  const archive = useMutation({ mutationFn: (habit: Habit) => sendData(`/habits/${habit.id}`, 'PATCH', { isActive: false }), onSuccess: () => { setArchivingHabit(null); refresh(); } });
  const logMutation = useMutation({ mutationFn: ({ habit, value }: { habit: Habit; value: number }) => {
    const existing = logs.data?.find((log) => log.habitId === habit.id && log.date.slice(0, 10) === date);
    const payload = { habitId: habit.id, date, value, note: null };
    return existing ? sendData(`/habit-logs/${existing.id}`, 'PATCH', { value, note: null }) : sendData('/habit-logs', 'POST', payload);
  }, onSuccess: refresh });

  const todayLogs = new Map((logs.data ?? []).filter((log) => log.date.slice(0, 10) === date).map((log) => [log.habitId, log.value]));
  const weeklyValues = new Map<string, number>(); for (const log of logs.data ?? []) weeklyValues.set(log.habitId, (weeklyValues.get(log.habitId) ?? 0) + log.value);
  const active = (habits.data ?? []).filter((habit) => habit.isActive !== false);
  const weekStats = (habit: Habit) => habit.frequency === 'WEEKLY' ? Math.min(habit.targetValue, weeklyValues.get(habit.id) ?? 0) : (logs.data ?? []).filter((log) => log.habitId === habit.id && log.value >= habit.targetValue).length;
  const doneToday = active.filter((habit) => (habit.frequency === 'WEEKLY' ? weeklyValues.get(habit.id) ?? 0 : todayLogs.get(habit.id) ?? 0) >= habit.targetValue).length;

  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  return <><PageHeading eyebrow="STEADY, NOT PERFECT" title="Habits" subtitle="Build a rhythm with small actions that can flex with real life." action={<Button onClick={() => setEditing(null)}><Plus size={16}/> New habit</Button>} />
    <Card className="habit-overview"><div className="habit-overview-symbol"><Leaf size={20}/></div><div className="habit-overview-copy"><p className="eyebrow">TODAY'S GENTLE CHECK-IN</p><h2>{active.length ? `${doneToday} of ${active.length} intentions met` : 'Make room for a new rhythm'}</h2><p className="muted">A partial check-in still matters. Rest days are part of a routine, too.</p></div><div className="habit-week-pill"><Sparkles size={15}/><span>Past seven days are a better guide than a streak.</span></div></Card>
    {habits.isLoading ? <Loading label="Gathering your habits"/> : active.length === 0 ? <Card><EmptyState icon={<Target size={18}/>} title="Start with something small" body="Choose a rhythm that feels kind and realistic. You can make it flexible or adjust it anytime." action={<Button onClick={() => setEditing(null)}><Plus size={15}/> Create a habit</Button>}/></Card> : <div className="habit-grid">{active.map((habit) => {
      const current = habit.frequency === 'WEEKLY' ? weeklyValues.get(habit.id) ?? 0 : todayLogs.get(habit.id) ?? 0;
      const currentToday = todayLogs.get(habit.id) ?? 0;
      const progress = Math.min(100, current / habit.targetValue * 100);
      const weekly = weekStats(habit);
      const bloomDays = (logs.data ?? []).filter((log) => log.habitId === habit.id && log.value > 0).length;
      const input = values[habit.id] ?? String(currentToday || '');
      return <Card className="habit-card" key={habit.id}>
        <div className="habit-card-top">
          <span className="habit-icon"><Leaf size={17}/></span>
          <button className="quiet-icon" aria-label="Archive habit" onClick={() => setArchivingHabit(habit)}><Archive size={15}/></button>
        </div>
        <div className="habit-card-heading">
          <h3>{habit.name}</h3>
          <Badge tone={habit.flexible ? 'mint' : 'violet'}>{habit.flexible ? 'Flexible' : 'Planned'}</Badge>
        </div>
        {habit.description && <p className="muted habit-description">{habit.description}</p>}
        <div className="habit-target"><Target size={14}/><span>Goal: {habit.targetValue} {habit.targetUnit} · {habit.frequency?.toLowerCase() ?? 'daily'}</span></div>
        <div className="habit-progress-caption"><span>{habit.frequency === 'WEEKLY' ? 'This week' : 'Today'}</span><strong>{current} / {habit.targetValue} {habit.targetUnit}</strong></div>
        <ProgressBar value={progress}/>

        <div style={{ margin: '14px 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <small className="muted" style={{ fontSize: '11px' }}>7-day rhythm</small>
          <div style={{ display: 'flex', gap: '6px' }}>
            {past7Days.map((d) => {
              const logForDay = logs.data?.find((l) => l.habitId === habit.id && l.date.slice(0, 10) === d);
              const val = logForDay?.value ?? 0;
              const met = val >= habit.targetValue;
              const partial = val > 0 && !met;
              const titleDay = new Intl.DateTimeFormat(undefined, { weekday: 'narrow', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
              return (
                <span
                  key={d}
                  title={`${titleDay}: ${val} ${habit.targetUnit}`}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: met ? '#67E8D0' : partial ? '#A78BFA' : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: met ? '0 0 6px rgba(103, 232, 208, 0.4)' : undefined,
                    display: 'inline-block',
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="habit-log-row"><TextInput type="number" min="0" max={habit.targetValue * 5} step="any" value={input} onChange={(e) => setValues({ ...values, [habit.id]: e.target.value })} aria-label={`${habit.name} progress`}/><Button variant={progress >= 100 ? 'outline' : 'primary'} disabled={logMutation.isPending || input === '' || Number(input) < 0} onClick={() => logMutation.mutate({ habit, value: Number(input) })}>{progress >= 100 ? <><Check size={15}/> Update</> : 'Log progress'}</Button></div>
        <div className="habit-card-bottom"><span><span className="habit-bloom" role="img" aria-label={`${bloomDays} days with a check-in in the past week`}><svg viewBox="0 0 24 24" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <ellipse key={index} className={index < bloomDays ? 'filled' : ''} cx="12" cy="5" rx="2.7" ry="4.1" transform={`rotate(${index * (360 / 7)} 12 12)`}/>) }<circle cx="12" cy="12" r="2.4"/></svg></span>{weekly} {habit.frequency === 'WEEKLY' ? 'of this week’s goal' : 'full check-ins in 7 days'}</span><button className="text-button" onClick={() => setEditing(habit)}>Edit <ArrowUpRight size={13}/></button></div>
      </Card>;
    })}</div>}
    {logMutation.isError && <p className="inline-error">Could not save this check-in. {logMutation.error instanceof Error ? logMutation.error.message : ''}</p>}
    {editing !== undefined && <HabitEditor habit={editing ?? undefined} saving={save.isPending} onClose={() => setEditing(undefined)} onSave={(value) => save.mutate(value)}/>}
    <ConfirmDialog
      isOpen={archivingHabit !== null}
      title="Archive this habit?"
      message={`"${archivingHabit?.name}" will be removed from your active daily routines, but past logs will be preserved.`}
      confirmLabel="Archive routine"
      tone="primary"
      onConfirm={() => { if (archivingHabit) archive.mutate(archivingHabit); }}
      onCancel={() => setArchivingHabit(null)}
    />
  </>;
}

function HabitEditor({ habit, saving, onClose, onSave }: { habit?: HabitInput; saving: boolean; onClose: () => void; onSave: (habit: HabitInput) => void }) {
  const [name, setName] = useState(habit?.name ?? ''); const [description, setDescription] = useState(habit?.description ?? ''); const [target, setTarget] = useState(String(habit?.targetValue ?? 1)); const [unit, setUnit] = useState(habit?.targetUnit ?? 'times'); const [frequency, setFrequency] = useState(habit?.frequency ?? 'DAILY'); const [flexible, setFlexible] = useState(habit?.flexible ?? true); const [days, setDays] = useState<number[]>(habit?.daysOfWeek ?? []); const [error, setError] = useState('');
  function submit(event: FormEvent) { event.preventDefault(); if (!name.trim()) return setError('Give this habit a name.'); const numeric = Number(target); if (!numeric || numeric <= 0) return setError('Choose a target greater than zero.'); if (frequency === 'CUSTOM' && !days.length) return setError('Choose at least one day for a custom rhythm.'); onSave({ ...(habit?.id ? { id: habit.id } : {}), name: name.trim(), description: description || null, targetValue: numeric, targetUnit: unit.trim() || 'times', frequency, daysOfWeek: frequency === 'CUSTOM' ? days : [], flexible, isActive: true }); }
  return <Modal title={habit ? 'Tune your rhythm' : 'Create a gentle rhythm'} onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Habit"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stretch for a few minutes" autoFocus/></Field><Field label="A note to yourself (optional)"><TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why does this matter to you?"/></Field><div className="form-grid"><Field label={frequency === 'WEEKLY' ? 'Goal per week' : 'Target'}><TextInput type="number" min="0.1" step="any" value={target} onChange={(e) => setTarget(e.target.value)}/></Field><Field label="Target unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="minutes, glasses, sessions"/></Field><Field label="Frequency"><SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="CUSTOM">Custom days</option></SelectInput></Field></div>{frequency === 'CUSTOM' && <div className="day-picks"><span>Choose days</span>{[['M',1],['T',2],['W',3],['T',4],['F',5],['S',6],['S',0]].map(([label,day]) => <button type="button" key={String(day)} className={days.includes(Number(day)) ? 'selected' : ''} onClick={() => setDays((current) => current.includes(Number(day)) ? current.filter((x) => x !== Number(day)) : [...current, Number(day)])}>{label}</button>)}</div>}<label className="check-row"><input type="checkbox" checked={flexible} onChange={(e) => setFlexible(e.target.checked)}/><span><strong>Keep this flexible</strong><small>Let partial progress count toward your rhythm.</small></span></label>{error && <p className="inline-error">{error}</p>}<div className="modal-actions"><Button type="button" variant="quiet" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? 'Saving…' : 'Save habit'}</Button></div></form></Modal>;
}
