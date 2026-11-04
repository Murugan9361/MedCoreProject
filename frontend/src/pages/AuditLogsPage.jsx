import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Terminal,
} from 'lucide-react';
import { auditApi } from '../api/audit';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const AuditLogsPage = () => {
  const { showError, showSuccess } = useNotification();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (actionFilter) params.action = actionFilter;
      if (userIdFilter) params.user_id = Number(userIdFilter);

      const data = await auditApi.getAuditLogs(params);
      setLogs(data || []);
    } catch (err) {
      showError(err.message || 'Failed to fetch audit log trail');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medcore_audit_trail_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showSuccess('Audit log trail exported to JSON');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            System Audit Trail & Compliance Log
          </h2>
          <p className="text-muted text-sm">
            HIPAA compliant security activity logging, administrative events, and EMR access history
          </p>
        </div>

        <button onClick={handleExportJson} className="btn btn-outline">
          <Download size={16} />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
        <form onSubmit={handleFilterSubmit} className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-muted" />
            <span className="font-semibold text-sm">Action Type:</span>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. LOGIN, CREATE, UPDATE"
              style={{ width: 'auto', minWidth: '180px', padding: '0.4rem 0.8rem' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <User size={16} className="text-muted" />
            <span className="font-semibold text-sm">User ID:</span>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 1"
              style={{ width: 'auto', minWidth: '100px', padding: '0.4rem 0.8rem' }}
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            <Filter size={14} />
            <span>Apply Filters</span>
          </button>

          {(actionFilter || userIdFilter) && (
            <button
              type="button"
              onClick={() => {
                setActionFilter('');
                setUserIdFilter('');
                auditApi.getAuditLogs({ limit: 100 }).then((d) => setLogs(d || []));
              }}
              className="btn btn-outline btn-sm"
            >
              Reset
            </button>
          )}

          <div className="flex-1 text-right text-muted text-sm">
            Showing <span className="font-bold text-primary">{logs.length}</span> audit event entries
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Retrieving security audit records..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No audit log events found"
            description="Audit events recorded by the backend system will be streamed and visible here."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action Event</th>
                  <th>Target Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="font-semibold text-sm">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-muted text-xs">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-primary">User #{log.user_id}</div>
                      <div className="text-muted text-xs">Facility: #{log.hospital_id || 'System'}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{log.action}</span>
                    </td>
                    <td>
                      <div className="font-medium text-sm">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
