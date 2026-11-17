import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { 
  FolderArchive, 
  UploadCloud, 
  FileCheck, 
  FileWarning, 
  FileText, 
  Search, 
  Trash2, 
  Download, 
  Eye, 
  Clock,
  X
} from 'lucide-react';

export default function Documents() {
  const { documents, guards, addDocument, deleteDocument } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [guardId, setGuardId] = useState(guards[0]?.guardId || '');
  const [category, setCategory] = useState('Identity Proof');

  // Stats
  const totalDocs = documents.length;
  const verifiedDocs = documents.filter(d => d.status === 'verified').length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const expiredDocs = documents.filter(d => d.status === 'expired').length;

  const categories = ['Identity Proof', 'Address Proof', 'Police Verification', 'Training Certificate', 'Medical Certificate'];

  // Filter
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.guardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.guardId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedGuard = guards.find(g => g.guardId === guardId);
    const newDoc = {
      title,
      guardId,
      guardName: matchedGuard ? matchedGuard.name : 'Unknown Guard',
      category,
      type: 'PDF',
      fileSize: '1.4 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'pending'
    };

    addDocument(newDoc);
    setTitle('');
    setIsUploadOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111C30] border border-[#2B3B52] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#F8FAFC] tracking-tight">Document Management</h1>
          <p className="text-xs md:text-sm text-[#A8B6C9] mt-1">
            Central repository for guard identity proofs, police background verifications, and compliance records
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all self-start md:self-auto cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={totalDocs}
          icon={FolderArchive}
          color="blue"
          subtext="Stored in enterprise repository"
        />
        <StatCard
          title="Verified & Approved"
          value={verifiedDocs}
          icon={FileCheck}
          color="green"
          subtext={`${((verifiedDocs / (totalDocs || 1)) * 100).toFixed(0)}% verification rate`}
        />
        <StatCard
          title="Pending Verification"
          value={pendingDocs}
          icon={Clock}
          color="amber"
          subtext="Awaiting manager sign-off"
        />
        <StatCard
          title="Expired / Flagged"
          value={expiredDocs}
          icon={FileWarning}
          color="purple"
          subtext="Requires guard document renewal"
        />
      </div>

      {/* Filter and Table Card */}
      <div className="bg-[#172337] border border-[#2B3B52] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#60A5FA]" />
            Guard Compliance Vault
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A8B6C9]" />
              <input
                type="text"
                placeholder="Search doc name or guard..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] placeholder-[#A8B6C9]/60 focus:outline-none focus:border-[#3B82F6] w-48 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="all">All Verification Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto rounded-lg border border-[#2B3B52]">
          <table className="w-full text-left text-sm text-[#F8FAFC]">
            <thead className="text-[11px] uppercase bg-[#111C30] text-[#A8B6C9] border-b border-[#2B3B52] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Associated Guard</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Format & Size</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B52]/50">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#A8B6C9] text-xs">
                    No documents match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#1E2D43]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#60A5FA] flex-shrink-0" />
                        <span className="font-semibold text-[#F8FAFC] text-xs">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="text-[#F8FAFC] font-medium">{doc.guardName}</span>
                      <span className="block text-[11px] font-mono text-[#60A5FA]">{doc.guardId}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#A8B6C9]">
                      <span className="px-2 py-0.5 rounded bg-[#1E2D43] border border-[#2B3B52] text-[#A8B6C9]">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#A8B6C9]">
                      {doc.type} • {doc.fileSize}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#A8B6C9]">
                      {doc.uploadDate}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer"
                          title="Preview Document Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => alert(`Downloading ${doc.title} (${doc.type}) file...`)}
                          className="p-1.5 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] border border-[#2B3B52] transition-colors cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete document "${doc.title}"?`)) {
                              deleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#F87171] border border-red-500/20 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl w-full max-w-md p-6 shadow-2xl relative text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-4 border-b border-[#2B3B52]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#60A5FA]" />
                Upload Guard Document
              </h3>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Police Background Clearance"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Select Security Guard *</label>
                <select
                  value={guardId}
                  onChange={e => setGuardId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  {guards.map(g => (
                    <option key={g.id} value={g.guardId}>{g.name} ({g.guardId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8B6C9] mb-1">Document Classification *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0B1220] border border-[#2B3B52] text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Simulated File Dropzone */}
              <div className="border-2 border-dashed border-[#2B3B52] hover:border-[#3B82F6]/60 rounded-xl p-4 text-center cursor-pointer bg-[#0B1220]/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-[#60A5FA] mx-auto mb-2 opacity-80" />
                <p className="text-xs text-[#F8FAFC] font-medium">Click to select PDF or image file</p>
                <p className="text-[11px] text-[#A8B6C9] mt-0.5">Maximum file size: 10MB (PDF, PNG, JPG)</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Save Document
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="py-2 px-4 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] text-xs font-medium transition-colors border border-[#2B3B52] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Document Details Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172337] border border-[#2B3B52] rounded-xl w-full max-w-md p-6 shadow-2xl relative text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-4 border-b border-[#2B3B52]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                Document Metadata & Audit
              </h3>
              <button 
                onClick={() => setViewingDoc(null)}
                className="text-[#A8B6C9] hover:text-[#F8FAFC] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-[#0B1220] p-3 rounded-lg border border-[#2B3B52]">
                <p className="text-[#A8B6C9]">Document Title</p>
                <p className="text-[#F8FAFC] font-bold text-sm mt-0.5">{viewingDoc.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B1220] p-3 rounded-lg border border-[#2B3B52]">
                  <p className="text-[#A8B6C9]">Personnel</p>
                  <p className="text-[#F8FAFC] font-semibold mt-0.5">{viewingDoc.guardName}</p>
                  <p className="text-[#60A5FA] font-mono text-[11px]">{viewingDoc.guardId}</p>
                </div>
                <div className="bg-[#0B1220] p-3 rounded-lg border border-[#2B3B52]">
                  <p className="text-[#A8B6C9]">Category</p>
                  <p className="text-[#F8FAFC] font-semibold mt-0.5">{viewingDoc.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B1220] p-3 rounded-lg border border-[#2B3B52]">
                  <p className="text-[#A8B6C9]">Upload Date</p>
                  <p className="text-[#F8FAFC] font-mono mt-0.5">{viewingDoc.uploadDate}</p>
                </div>
                <div className="bg-[#0B1220] p-3 rounded-lg border border-[#2B3B52]">
                  <p className="text-[#A8B6C9]">Verification Status</p>
                  <div className="mt-1">
                    <StatusBadge status={viewingDoc.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  alert(`Downloading ${viewingDoc.title}...`);
                  setViewingDoc(null);
                }}
                className="flex-1 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Copy
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="py-2 px-4 rounded-lg bg-[#1E2D43] hover:bg-[#2B3B52] text-[#A8B6C9] hover:text-[#F8FAFC] text-xs font-medium border border-[#2B3B52] cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
