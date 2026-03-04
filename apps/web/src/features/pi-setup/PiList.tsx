import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTeams } from '../../hooks/use-teams';
import { usePis, useDeletePi } from '../../hooks/use-pis';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function PiList() {
  const { data: teams = [] } = useTeams();
  const [teamId, setTeamId] = useState('');
  const [confirmPi, setConfirmPi] = useState<{ id: string; name: string } | null>(null);
  const { data: pis = [] } = usePis(teamId);
  const deletePi = useDeletePi(teamId);

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !teamId) setTeamId(teams[0].id);
  }, [teams, teamId]);

  const selectedTeam = teams.find(t => t.id === teamId);

  const handleDelete = (e: React.MouseEvent, piId: string, piName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmPi({ id: piId, name: piName });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-on-surface">PI Planning</h1>
        <Link to="/new"><Button>+ New PI</Button></Link>
      </div>

      {/* Team tabs */}
      {teams.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setTeamId(team.id)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                team.id === teamId
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 shadow-md'
                  : 'bg-surface text-on-surface-muted border-border hover:border-indigo-400 hover:text-accent'
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      )}

      {/* PI cards */}
      {teamId ? (
        <>
          {selectedTeam && (
            <p className="text-sm text-on-surface-muted mb-4">
              {pis.length} {pis.length === 1 ? 'PI' : 'PIs'} for <strong>{selectedTeam.name}</strong>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pis.map(pi => (
              <Link key={pi.id} to={`/pi/${pi.id}`}>
                <Card className="p-5 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer h-full">
                  {/* Colored top stripe */}
                  <div className="h-1.5 bg-indigo-500 rounded-full mb-4 -mt-1 -mx-1" />
                  <h3 className="font-bold text-on-surface text-lg mb-1">{pi.name}</h3>
                  <p className="text-sm text-on-surface-muted mb-4">
                    {pi.startDate} → {pi.endDate}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded font-semibold">
                      {pi.totalCapacity} SP capacity
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, pi.id, pi.name)}
                        title="Delete PI"
                        className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                      >
                        🗑
                      </button>
                      <span className="text-xs text-on-surface-subtle">Open board →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}

            {/* New PI card */}
            <Link to="/new">
              <Card className="p-5 border-dashed border-2 flex flex-col items-center justify-center min-h-[140px] hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer">
                <span className="text-2xl mb-2">＋</span>
                <span className="text-sm text-on-surface-subtle font-medium">New PI</span>
              </Card>
            </Link>
          </div>

          {pis.length === 0 && (
            <div className="text-center py-8 text-on-surface-subtle col-span-full">
              <p className="text-sm">No PIs yet for this team — click the card above to create one.</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-on-surface-subtle">
          <p>Select a team above</p>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmPi}
        title="Delete PI"
        message={confirmPi ? `Delete "${confirmPi.name}"? This will remove all sprints, features, and stories.` : undefined}
        confirmLabel="Delete PI"
        isPending={deletePi.isPending}
        onConfirm={() => { if (confirmPi) deletePi.mutate(confirmPi.id); setConfirmPi(null); }}
        onCancel={() => setConfirmPi(null)}
      />
    </div>
  );
}
