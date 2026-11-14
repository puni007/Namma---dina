import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowUpDown, Check, CheckCircle2, ChevronRight, Clock3, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { getData, sendData, type Task } from '../lib/api';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Loading, Modal, PageHeading, SelectInput, TextArea, TextInput } from '../components/ui';
import { formatTime } from '../lib/format';
import { dateTimeFromLocal, dateTimeLocalInput } from '../lib/format';
import { AIQuickAddCard } from '../components/AICompanion';

type EditTask = Partial<Task> & { id?: string };
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const statuses: Array<{ key: string; label: string }> = [
  { key: '', label: 'Everything' },
  { key: 'PENDING', label: 'To do' },
  { key: 'IN_PROGRESS', label: 'In motion' },
  { key: 'COMPLETED', label: 'Complete' },
  { key: 'POSTPONED', label: 'Later' },
];

const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function TasksPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'due' | 'title'>('created');
  const [editing, setEditing] = useState<EditTask | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<Array<{ id: string; name: string }>>('/categories?limit=100') });
  const key = ['tasks', status, search];
  const query = useQuery({ queryKey: key, queryFn: () => getData<Task[]>(`/tasks?limit=100${status ? `&status=${status}` : ''}${search ? `&q=${encodeURIComponent(search)}` : ''}`) });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['tasks'] }); void queryClient.invalidateQueries({ queryKey: ['overview'] }); };
  const addQuick = useMutation({ mutationFn: () => sendData('/tasks', 'POST', { title: title.trim(), priority, scheduledMinutes: 30 }), onSuccess: () => { setTitle(''); setPriority('MEDIUM'); refresh(); } });
  const save = useMutation({ mutationFn: (task: EditTask) => task.id ? sendData(`/tasks/${task.id}`, 'PATCH', { title: task.title, description: task.description || null, status: task.status, priority: task.priority, dueAt: task.dueAt || null, scheduledStart: task.scheduledStart || null, scheduledMinutes: task.scheduledMinutes || 30, recurrenceRule: task.recurrenceRule || null, completedAt: task.completedAt ?? (task.status === 'COMPLETED' ? new Date().toISOString() : null) }) : sendData('/tasks', 'POST', task), onSuccess: () => { setEditing(undefined); refresh(); } });
  const remove = useMutation({ mutationFn: (id: string) => sendData(`/tasks/${id}`, 'DELETE'), onSuccess: () => { setDeletingId(null); refresh(); } });

  const rawRows = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => {
    let list = rawRows;
    if (categoryFilter) {
      list = list.filter((t) => t.categoryId === categoryFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        if (diff !== 0) return diff;
      } else if (sortBy === 'due') {
        const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        if (dueA !== dueB) return dueA - dueB;
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0; // Default created order from server
    });
  }, [rawRows, categoryFilter, sortBy]);

  const counts = useMemo(() => statuses.map((tab) => ({ ...tab, count: !tab.key ? rawRows.length : rawRows.filter((task) => task.status === tab.key).length })), [rawRows]);
  function quickSubmit(event: FormEvent) { event.preventDefault(); if (title.trim()) addQuick.mutate(); }
  function mark(task: Task) { save.mutate({ ...task, status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED', completedAt: task.status === 'COMPLETED' ? null : new Date().toISOString() }); }

  return <><PageHeading eyebrow="MAKE ROOM FOR WHAT MATTERS" title="Tasks" subtitle="A clear list, with room to change your mind." action={<Button onClick={() => setEditing(null)}><Plus size={16} /> New task</Button>} />
    <Card className="quick-add-card"><div className="quick-add-icon"><Plus size={17} /></div><form onSubmit={quickSubmit} className="quick-add-form"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What would you like to make space for?" aria-label="Quick add a task" /><SelectInput value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Task priority">{priorities.map((item) => <option key={item}>{item}</option>)}</SelectInput><Button disabled={!title.trim() || addQuick.isPending}>{addQuick.isPending ? 'Adding…' : 'Add task'}</Button></form></Card>
    <AIQuickAddCard onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['tasks'] }); void queryClient.invalidateQueries({ queryKey: ['habits'] }); void queryClient.invalidateQueries({ queryKey: ['overview'] }); }} />
    {addQuick.isError && <p className="inline-error">{addQuick.error instanceof Error ? addQuick.error.message : 'Could not add this task.'}</p>}
    <Card className="task-card">
      <div className="task-toolbar">
        <div className="filter-tabs">
          {counts.map((tab) => (
            <button key={tab.key} onClick={() => setStatus(tab.key)} className={`filter-tab ${status === tab.key ? 'selected' : ''}`}>
              {tab.label}<span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px' }}>
            <Search size={15} />
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a task" />
          </div>
          {(categories.data ?? []).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} className="muted" />
              <SelectInput value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ minWidth: '130px', height: '38px', padding: '6px 10px', fontSize: '12px' }}>
                <option value="">All categories</option>
                {(categories.data ?? []).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </SelectInput>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} className="muted" />
            <SelectInput value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{ minWidth: '130px', height: '38px', padding: '6px 10px', fontSize: '12px' }}>
              <option value="created">Recently added</option>
              <option value="priority">By priority</option>
              <option value="due">By deadline</option>
              <option value="title">Alphabetical (A-Z)</option>
            </SelectInput>
          </div>
        </div>
      </div>
      {query.isLoading ? <Loading label="Gathering your tasks" /> : query.isError ? <div className="error-state"><AlertCircle size={18} />Your tasks couldn’t load. Please try again.</div> : filtered.length === 0 ? <EmptyState title={search || status || categoryFilter ? 'Nothing matches just now' : 'A clear page is a lovely start'} body={search || status || categoryFilter ? 'Try another filter or start a new task.' : 'Add one small thing you want to do. You can always move it around later.'} action={<Button variant="outline" onClick={() => setEditing(null)}><Plus size={15} /> Add a task</Button>} /> : <div className="task-list">{filtered.map((task) => <div className={`task-row ${task.status === 'COMPLETED' ? 'task-complete' : ''}`} key={task.id}><button onClick={() => mark(task)} className={`task-check ${task.status === 'COMPLETED' ? 'checked' : ''}`} aria-label={task.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}>{task.status === 'COMPLETED' && <Check size={14} />}</button><div className="task-main"><div className="task-title-line"><h3>{task.title}</h3><Badge tone={task.priority === 'URGENT' ? 'amber' : task.priority === 'HIGH' ? 'violet' : 'mint'}>{task.priority}</Badge></div>{task.description && <p className="muted task-description">{task.description}</p>}<div className="task-meta">{task.category && <span className="category-dot" style={{ background: task.category.color }} />}{task.category?.name && <span>{task.category.name}</span>}{task.scheduledStart && <span><Clock3 size={13} />{formatTime(task.scheduledStart)}</span>}{task.dueAt && <span>Due {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(task.dueAt))}</span>}</div></div><div className="task-actions"><button className="icon-button" aria-label="Edit task" onClick={() => setEditing(task)}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label="Delete task" onClick={() => setDeletingId(task.id)}><Trash2 size={15} /></button></div></div>)}</div>}
    </Card>
    <div className="task-footer-note"><CheckCircle2 size={16} /> Progress can be imperfect and still be progress. <ChevronRight size={15} /></div>
    {editing !== undefined && <TaskEditor task={editing ?? undefined} saving={save.isPending} onClose={() => setEditing(undefined)} onSave={(task) => save.mutate(task)} />}
    {(save.isError || remove.isError) && <p className="inline-error">This change could not be saved. {save.error instanceof Error ? save.error.message : ''}</p>}
    <ConfirmDialog
      isOpen={deletingId !== null}
      title="Delete task?"
      message="Are you sure you want to delete this task and its history? This action cannot be undone."
      confirmLabel="Delete task"
      onConfirm={() => { if (deletingId) remove.mutate(deletingId); }}
      onCancel={() => setDeletingId(null)}
    />
  </>;
}

function TaskEditor({ task, saving, onClose, onSave }: { task?: EditTask; saving: boolean; onClose: () => void; onSave: (task: EditTask) => void }) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<Array<{ id: string; name: string }>>('/categories?limit=100') });
  const [title, setTitle] = useState(task?.title ?? ''); const [description, setDescription] = useState(task?.description ?? ''); const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'MEDIUM'); const [status, setStatus] = useState<Task['status']>(task?.status ?? 'PENDING'); const [minutes, setMinutes] = useState(String(task?.scheduledMinutes ?? 30)); const [due, setDue] = useState(task?.dueAt ? dateTimeLocalInput(task.dueAt) : ''); const [error, setError] = useState('');
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? ''); const [recurrence, setRecurrence] = useState(task?.recurrenceRule ?? '');
  function submit(event: FormEvent) { event.preventDefault(); setError(''); if (!title.trim()) return setError('Add a short title to continue.'); onSave({ ...(task?.id ? { id: task.id } : {}), title: title.trim(), description: description || null, priority: priority as Task['priority'], status: status as Task['status'], scheduledMinutes: Number(minutes) || 30, dueAt: due ? dateTimeFromLocal(due).toISOString() : null, categoryId: categoryId || null, recurrenceRule: recurrence || null }); }
  return <Modal title={task ? 'Make a change' : 'Make space for something'} onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Task"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field><Field label="A little context (optional)"><TextArea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field><div className="form-grid"><Field label="Priority"><SelectInput value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>{priorities.map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="Status"><SelectInput value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>{['PENDING', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED'].map((x) => <option key={x}>{x}</option>)}</SelectInput></Field><Field label="Category"><SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">No category</option>{(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput></Field><Field label="Time to set aside (minutes)"><TextInput type="number" min="5" max="720" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field><Field label="Deadline (optional)"><TextInput type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field><Field label="Repeat"><SelectInput value={recurrence} onChange={(e) => setRecurrence(e.target.value)}><option value="">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></SelectInput></Field></div>{error && <p className="inline-error">{error}</p>}<div className="modal-actions"><Button type="button" variant="quiet" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? 'Saving…' : 'Save task'}</Button></div></form></Modal>;
}
