import { useState, useEffect, useCallback } from "react";
import { api } from "./api/client";
import { AlertCircle, User, ShieldAlert, Check } from "lucide-react";

export interface ProfileReport {
  id: string;
  reportedUserId: string;
  reportedUser?: { email: string };
  reporterUserId: string;
  reporterUser?: { email: string };
  reason: string;
  details: string;
  createdAt: string;
}

export function ProfileReportsQueue() {
  const [reports, setReports] = useState<ProfileReport[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] = useState<ProfileReport | null>(null);
  const [resolveStatus, setResolveStatus] = useState("RESOLVED_NO_ACTION");
  const [staffNotes, setStaffNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = (await api.getProfileReports(page)) as { items: ProfileReport[]; total: number; pageSize: number };
      setReports(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / (data.pageSize || 20)) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile reports");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openResolveModal = (report: ProfileReport) => {
    setSelectedReport(report);
    setResolveStatus("RESOLVED_NO_ACTION");
    setStaffNotes("");
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    setIsResolving(true);
    try {
      await api.resolveProfileReport(selectedReport.id, resolveStatus, staffNotes);
      setSelectedReport(null);
      loadReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve report");
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading && reports.length === 0) {
    return <div className="p-4 text-slate-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Profile Reports</h2>
        <button onClick={loadReports} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Refresh</button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <ShieldAlert size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">No pending reports</p>
          <p className="text-slate-500 text-sm mt-1">The profile reports queue is currently empty.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Reported User</th>
                  <th className="px-4 py-3 font-medium">Reporter</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-slate-400" />
                        <a href={`/profile/${report.reportedUserId}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-medium hover:underline">
                          {report.reportedUser?.email || report.reportedUserId}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {report.reporterUser?.email || report.reporterUserId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{report.reason}</span>
                      <p className="text-xs text-slate-500 truncate max-w-xs" title={report.details}>{report.details}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openResolveModal(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-medium rounded hover:bg-emerald-100 transition-colors"
                      >
                        <Check size={14} /> Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {selectedReport && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Resolve Profile Report</h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Details</label>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-700">
                  <p><strong>Reason:</strong> {selectedReport.reason}</p>
                  <p className="mt-1"><strong>Details:</strong> {selectedReport.details}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resolution Action</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="RESOLVED_NO_ACTION">No Action Needed</option>
                  <option value="RESOLVED_PROFILE_HIDDEN">Hide Profile</option>
                  <option value="RESOLVED_PROFILE_BANNED">Ban Profile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Staff Notes</label>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Internal notes about this resolution..."
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={isResolving || !staffNotes.trim()}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isResolving ? "Resolving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
