import { useState } from 'react';
import { Droplets, Footprints, HeartPulse, Moon } from 'lucide-react';
import { PageHeading } from '../components/ui';
import { ResourcePage } from './ResourcePages';
import { todayKey } from '../lib/format';

const tabs = [
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'movement', label: 'Movement', icon: Footprints },
  { id: 'check-in', label: 'Mood & energy', icon: HeartPulse },
] as const;

export function WellnessPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('water');
  const today = todayKey();
  const active = {
    water: <ResourcePage path="/water" title="Water check-ins" eyebrow="A GENTLE HYDRATION LOG" subtitle="Log a glass when it happens. Your target can be changed in settings." fields={[{ key: 'date', label: 'Day', type: 'date', defaultValue: today }, { key: 'amountMl', label: 'Amount (ml)', type: 'number' }]} columns={[{ key: 'date', label: 'Day' }, { key: 'amountMl', label: 'Amount', suffix: ' ml' }, { key: 'loggedAt', label: 'Logged', time: true }]} />,
    sleep: <ResourcePage path="/sleep" title="Sleep log" eyebrow="YOUR REST, NOT A SCORE" subtitle="Record your own bedtime and wake-up time for a simple history." fields={[{ key: 'date', label: 'Day', type: 'date', defaultValue: today }, { key: 'bedtime', label: 'Bedtime', type: 'datetime-local' }, { key: 'wakeTime', label: 'Wake time', type: 'datetime-local' }, { key: 'durationMins', label: 'Duration (minutes)', type: 'number' }, { key: 'notes', label: 'Notes (optional)', type: 'textarea', optional: true }]} columns={[{ key: 'date', label: 'Day' }, { key: 'durationMins', label: 'Duration', suffix: ' min' }, { key: 'bedtime', label: 'Bedtime', time: true }, { key: 'wakeTime', label: 'Wake time', time: true }]} />,
    movement: <ResourcePage path="/workouts" title="Movement log" eyebrow="MOVEMENT THAT FEELS LIKE YOURS" subtitle="A walk, stretch, workout or dance break — every kind of movement can be logged." fields={[{ key: 'activityType', label: 'Activity', type: 'text' }, { key: 'durationMins', label: 'Duration (minutes)', type: 'number' }, { key: 'loggedAt', label: 'When', type: 'datetime-local', optional: true }, { key: 'notes', label: 'Notes (optional)', type: 'textarea', optional: true }]} columns={[{ key: 'activityType', label: 'Activity' }, { key: 'durationMins', label: 'Duration', suffix: ' min' }, { key: 'loggedAt', label: 'When', time: true }, { key: 'notes', label: 'Notes' }]} />,
    'check-in': <ResourcePage path="/wellness" title="Mood & energy" eyebrow="HOW ARE YOU, REALLY?" subtitle="A private check-in to notice your own patterns. No diagnosis, no judgment." fields={[{ key: 'date', label: 'Day', type: 'date', defaultValue: today }, { key: 'mood', label: 'Mood (1–5)', type: 'rating', ratingLabels: ['Low', 'Slightly low', 'Neutral', 'Good', 'Radiant'] }, { key: 'energy', label: 'Energy (1–5)', type: 'rating', ratingLabels: ['Drained', 'Sluggish', 'Steady', 'Lively', 'Full'] }, { key: 'notes', label: 'Anything you want to note (optional)', type: 'textarea', optional: true }]} columns={[{ key: 'date', label: 'Day' }, { key: 'mood', label: 'Mood' }, { key: 'energy', label: 'Energy' }, { key: 'notes', label: 'Note' }]} />,
  }[tab];
  return <><PageHeading eyebrow="CARE FOR YOURSELF" title="Wellness" subtitle="A gentle place to notice the basics that support your day."/><div className="wellness-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={tab === id ? 'selected' : ''}><Icon size={15}/>{label}</button>)}</div>{active}</>;
}
