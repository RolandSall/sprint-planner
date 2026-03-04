import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams, useCreateTeam } from '../../hooks/use-teams';
import { useCreatePi } from '../../hooks/use-pis';
import { api } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useQueryClient } from '@tanstack/react-query';

interface SprintEntry { name: string; capacity: string; startDate: string; endDate: string }
interface ReleaseEntry { name: string; date: string }

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function PiSetup() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: teams = [] } = useTeams();
  const createTeam = useCreateTeam();
  const createPi = useCreatePi();

  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [piName, setPiName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [releases, setReleases] = useState<ReleaseEntry[]>([]);
  const [sprints, setSprints] = useState<SprintEntry[]>([
    { name: 'S1', capacity: '20', startDate: '', endDate: '' },
    { name: 'S2', capacity: '20', startDate: '', endDate: '' },
    { name: 'S3', capacity: '20', startDate: '', endDate: '' },
    { name: 'S4', capacity: '20', startDate: '', endDate: '' },
    { name: 'S5', capacity: '20', startDate: '', endDate: '' },
    { name: 'S6', capacity: '20', startDate: '', endDate: '' },
  ]);

  const totalCapacity = sprints.reduce((s, sp) => s + (parseInt(sp.capacity) || 0), 0);

  const addSprint = () => setSprints(prev => [...prev, { name: `S${prev.length + 1}`, capacity: '20', startDate: '', endDate: '' }]);
  const removeSprint = (i: number) => setSprints(prev => prev.filter((_, idx) => idx !== i));
  const updateSprint = (i: number, field: keyof SprintEntry, value: string) =>
    setSprints(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const setTwoWeeks = (i: number) => {
    const sd = sprints[i].startDate;
    if (!sd) return;
    updateSprint(i, 'endDate', addDays(sd, 13));
  };

  const autoFillDates = () => {
    const firstStart = sprints[0]?.startDate;
    if (!firstStart) return;
    setSprints(prev => prev.map((s, i) => {
      const start = addDays(firstStart, i * 14);
      return { ...s, startDate: start, endDate: addDays(start, 13) };
    }));
  };

  const canAutoFill = !!sprints[0]?.startDate;

  const addRelease = () => setReleases(prev => [...prev, { name: `Release ${prev.length + 1}`, date: '' }]);
  const removeRelease = (i: number) => setReleases(prev => prev.filter((_, idx) => idx !== i));
  const updateRelease = (i: number, field: keyof ReleaseEntry, value: string) =>
    setReleases(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let teamId = selectedTeamId;
    if (!teamId && teamName) {
      const team = await createTeam.mutateAsync({ name: teamName });
      teamId = team.id;
      setSelectedTeamId(teamId);
    }
    const pi = await createPi.mutateAsync({ teamId, name: piName, startDate, endDate });
    await Promise.all([
      ...sprints.map((s, i) => api.createSprint({
        piId: pi.id, name: s.name, order: i + 1, capacity: parseInt(s.capacity) || 0,
        startDate: s.startDate || null,
        endDate: s.endDate || null,
      })),
      ...releases.filter(r => r.date).map(r => api.createPiRelease({ piId: pi.id, name: r.name, date: r.date })),
    ]);
    qc.invalidateQueries({ queryKey: ['board', pi.id] });
    navigate(`/pi/${pi.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-on-surface mb-6">New PI Planning</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-on-surface-muted">Team</h2>
          {teams.length > 0 && (
            <select className="border border-border rounded px-3 py-2 text-sm bg-surface text-on-surface" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
              <option value="">Create new team…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {!selectedTeamId && <Input label="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} required={!selectedTeamId} placeholder="e.g. Platform Team" />}
        </Card>

        <Card className="p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-on-surface-muted">PI Details</h2>
          <Input label="PI Name" value={piName} onChange={e => setPiName(e.target.value)} required placeholder="e.g. PI 2026 Q1" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
        </Card>

        {/* Releases */}
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-on-surface-muted">Releases</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addRelease}>+ Add Release</Button>
          </div>
          {releases.length === 0 && (
            <p className="text-xs text-on-surface-subtle">No releases — add one to show 🚩 release lines on the board.</p>
          )}
          {releases.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <Input
                placeholder="Release name"
                value={r.name}
                onChange={e => updateRelease(i, 'name', e.target.value)}
              />
              <Input
                type="date"
                value={r.date}
                onChange={e => updateRelease(i, 'date', e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeRelease(i)}>✕</Button>
            </div>
          ))}
        </Card>

        <Card className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-on-surface-muted">Sprints</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-muted">Total PI Capacity: <strong>{totalCapacity} SP</strong></span>
              <Button type="button" variant="secondary" size="sm" onClick={addSprint}>+ Add Sprint</Button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-lg px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
            <span className="flex-1">Set Sprint 1's start date, then auto-fill all sprint dates as consecutive 2-week blocks.</span>
            <button
              type="button"
              onClick={autoFillDates}
              disabled={!canAutoFill}
              title="Auto-fill all sprint dates from Sprint 1 as 2-week blocks"
              className="px-3 py-1 rounded border border-indigo-300 bg-white text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              ⚡ Auto-fill 2W
            </button>
          </div>

          <div className="text-xs text-on-surface-subtle grid grid-cols-[4rem_5rem_1fr_1fr_auto_auto] gap-2 font-semibold">
            <span>Name</span><span>Capacity</span><span>Start Date</span><span>End Date</span><span></span><span></span>
          </div>

          {sprints.map((sprint, i) => (
            <div key={i} className="grid grid-cols-[4rem_5rem_1fr_1fr_auto_auto] items-center gap-2">
              <Input
                value={sprint.name}
                onChange={e => updateSprint(i, 'name', e.target.value)}
                placeholder="S1"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={sprint.capacity}
                  onChange={e => updateSprint(i, 'capacity', e.target.value)}
                  placeholder="20"
                  min={0}
                />
                <span className="text-xs text-on-surface-subtle shrink-0">SP</span>
              </div>
              <Input
                type="date"
                value={sprint.startDate}
                onChange={e => updateSprint(i, 'startDate', e.target.value)}
              />
              <Input
                type="date"
                value={sprint.endDate}
                onChange={e => updateSprint(i, 'endDate', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setTwoWeeks(i)}
                title="Set end date to 2 weeks after start"
                className="px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0"
              >
                2W
              </button>
              {sprints.length > 1
                ? <Button type="button" variant="ghost" size="sm" onClick={() => removeSprint(i)}>✕</Button>
                : <span />
              }
            </div>
          ))}
        </Card>

        <Button type="submit" disabled={createPi.isPending}>Create PI</Button>
      </form>
    </div>
  );
}
