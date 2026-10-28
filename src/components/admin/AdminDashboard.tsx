import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  RefreshCw,
  Lock,
  Key
} from 'lucide-react';
import { User, ReportItem, AuditLog } from '../../types/index.ts';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'logs'>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dedicated Super Admin Security Verification state
  const [isSecurityVerified, setIsSecurityVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('rudactivity_super_admin_verified') === 'true';
  });
  const [securityPasscode, setSecurityPasscode] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const loadData = async () => {
    if (!token || !isAdmin) return;
    setIsLoading(true);
    try {
      // 1. Overview metrics
      const ovRes = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ovRes.ok) {
        const data = await ovRes.json();
        setMetrics(data.metrics);
      }

      // 2. Users list
      const uRes = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (uRes.ok) {
        const data = await uRes.json();
        setUsersList(data.users || []);
      }

      // 3. Reports
      const rRes = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rRes.ok) {
        const data = await rRes.json();
        setReportsList(data.reports || []);
      }

      // 4. Audit logs
      const lRes = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (lRes.ok) {
        const data = await lRes.json();
        setLogsList(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isSecurityVerified) {
      loadData();
    }
  }, [isOpen, userQuery, isSecurityVerified]);

  if (!isOpen) return null;

  const handleVerifySecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    if (!securityPasscode.trim()) {
      setSecurityError('Shyizamo ijambobanga ry\'umutekano wihariye.');
      return;
    }

    setIsVerifyingSecurity(true);
    try {
      const res = await fetch('/api/admin/verify-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: securityPasscode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setIsSecurityVerified(true);
        sessionStorage.setItem('rudactivity_super_admin_verified', 'true');
        loadData();
      } else {
        setSecurityError(data.error || 'Umutekano wihariye ntiwemejwe. Injiza ijambobanga nyaryo ry\'umutekano.');
      }
    } catch (err: any) {
      setSecurityError('Habaye ikosa mu kwemeza umutekano.');
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const handleLockDashboard = () => {
    setIsSecurityVerified(false);
    sessionStorage.removeItem('rudactivity_super_admin_verified');
    setSecurityPasscode('');
  };

  const handleToggleSuspend = async (targetUser: User) => {
    try {
      const nextSuspended = !targetUser.isSuspended;
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isSuspended: nextSuspended }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isSuspended: nextSuspended } : u))
        );
      }
    } catch (err) {
      console.error('Suspend user error:', err);
    }
  };

  const handleChangeRole = async (targetUser: User, newRole: 'user' | 'moderator' | 'admin') => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error('Role change error:', err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReportsList((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
      }
    } catch (err) {
      console.error('Resolve report error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">RUDACTIVITY Administration</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {currentUser?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">Security enforcement, moderation & telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSecurityVerified && (
              <button
                onClick={handleLockDashboard}
                className="p-2 rounded-lg text-amber-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Funga Umutekano (Lock Dashboard)"
              >
                <Lock size={16} />
              </button>
            )}
            {isSecurityVerified && (
              <button
                onClick={loadData}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!isSecurityVerified ? (
          /* Umutekano Wihariye wa Super Admin Gate */
          <div className="p-8 sm:p-14 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto animate-in fade-in duration-200">
            <div className="relative mb-4">
              <div className="p-4 rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
                <Shield size={36} />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full ring-2 ring-slate-900">
                <Key size={13} />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white">Umutekano Wihariye wa Super Admin</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kugira ngo winjire muri Dashboard y'Ubuyobozi Bukuru, injiza ijambobanga ry'umutekano wihariye wagenewe Super Admin.
            </p>

            {securityError && (
              <div className="mt-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs w-full text-center">
                {securityError}
              </div>
            )}

            <form onSubmit={handleVerifySecurity} className="mt-5 w-full space-y-3">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Injiza Password y'umutekano wihariye..."
                  value={securityPasscode}
                  onChange={(e) => setSecurityPasscode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-center tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingSecurity}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingSecurity ? 'Gusuzuma Umutekano...' : 'Emeza Umutekano (Unlock Dashboard)'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Overview & Telemetry
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                User Management ({usersList.length})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Abuse Reports ({reportsList.filter((r) => r.status === 'pending').length} pending)
              </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Registered Accounts</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
                    {metrics?.totalUsers || 0}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Active WebSockets</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                    {metrics?.activeSockets || 0}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Messages Dispatched</span>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 tabular-nums">
                    {metrics?.totalMessages || 0}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Active Conversations</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
                    {metrics?.totalConversations || 0}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">WebRTC Calls Conducted</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
                    {metrics?.totalCalls || 0}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Pending Moderation Reports</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
                    {metrics?.pendingReports || 0}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="text-indigo-400" size={20} />
                  <div>
                    <h5 className="text-xs font-semibold text-white">Platform Health & Node Uptime</h5>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Process running for {metrics?.serverUptimeSec || 0} seconds · Express + Vite middleware · In-memory JSON atomic journal
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-medium">HEALTHY</span>
              </div>
            </div>
          )}

          {/* Tab 2: Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Filter by username, display name, or email..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">User</th>
                      <th className="py-2.5 px-4 font-medium">Role</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                            <div>
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-400">@{u.username} · {u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {u.role === 'superadmin' ? (
                            <span className="font-mono text-[10px] text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded">
                              Super Admin
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as any)}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                            >
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {u.isSuspended ? (
                            <span className="text-rose-400 font-medium">Suspended</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== 'superadmin' && (
                            <button
                              onClick={() => handleToggleSuspend(u)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                u.isSuspended
                                  ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                  : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                              }`}
                            >
                              {u.isSuspended ? 'Restore' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reportsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No moderation reports have been filed yet.
                </div>
              ) : (
                reportsList.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">Target Type: {rep.targetType}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          rep.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {rep.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">Reason: <span className="font-medium text-white">{rep.reason}</span></p>
                      {rep.details && (
                        <p className="text-xs text-slate-400 mt-0.5">Details: {rep.details}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">
                        Reported by @{rep.reporterUsername} on {new Date(rep.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                          className="px-2.5 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                        >
                          Resolve & Moderate
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Audit Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              {logsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">No audit events recorded yet.</div>
              ) : (
                logsList.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-indigo-400 font-semibold">{log.action}</span>
                      <span className="text-slate-400">Target: <strong className="text-slate-200">{log.target}</strong></span>
                      <span className="text-slate-500">by @{log.adminUsername}</span>
                    </div>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </>
    )}
  </div>
</div>
  );
};
