import React, { useState, useEffect } from 'react';
import { CouncilDocument, ViewType, DocumentComment } from '../types';
import { loadDocumentFileData } from '../services/firestoreSync';

interface DocumentDetailViewProps {
  document: CouncilDocument;
  isViewer?: boolean;
  onNavigate: (view: ViewType, data?: any) => void;
  onApprove: (docId: string, comment?: string) => void;
  onReject: (docId: string, reason?: string) => void;
  onAddComment: (docId: string, commentText: string) => void;
  onAddReply?: (docId: string, parentCommentId: string, replyText: string) => void;
  onDeleteDocument?: (docId: string) => void;
  onOpenInDrive?: (fileId: string) => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  document,
  isViewer,
  onNavigate,
  onApprove,
  onReject,
  onAddComment,
  onAddReply,
  onDeleteDocument,
  onOpenInDrive,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'document' | 'discussion'>('document');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Dynamic Cloud File Data state for multi-device synchronization
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(document.fileDataUrl || null);
  const [isLoadingFileData, setIsLoadingFileData] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Derived Google Embed Preview Link if available
  const getGoogleEmbedUrl = () => {
    if (document.driveFileId) {
      if (document.format === 'gdoc' || document.name.toLowerCase().includes('doc')) {
        return `https://docs.google.com/document/d/${document.driveFileId}/preview`;
      }
      if (document.format === 'gsheet' || document.format === 'xlsx' || document.name.toLowerCase().includes('sheet')) {
        return `https://docs.google.com/spreadsheets/d/${document.driveFileId}/preview`;
      }
      return `https://drive.google.com/file/d/${document.driveFileId}/preview`;
    }
    if (document.driveWebViewLink) {
      if (document.driveWebViewLink.includes('docs.google.com/document/d/')) {
        return document.driveWebViewLink.replace(/\/edit.*$/, '/preview');
      }
      if (document.driveWebViewLink.includes('docs.google.com/spreadsheets/d/')) {
        return document.driveWebViewLink.replace(/\/edit.*$/, '/preview');
      }
      if (document.driveWebViewLink.includes('drive.google.com/file/d/')) {
        return document.driveWebViewLink.replace(/\/view.*$/, '/preview');
      }
    }
    return null;
  };

  const googleEmbedUrl = getGoogleEmbedUrl();

  // Multi-user dynamic retrieval: If on a different device or file was chunked, load seamlessly from Firestore
  useEffect(() => {
    if (document.fileDataUrl) {
      setFileDataUrl(document.fileDataUrl);
      setIsLoadingFileData(false);
    } else if (!document.content && !googleEmbedUrl) {
      setIsLoadingFileData(true);
      setLoadingProgress(15);
      loadDocumentFileData(document.id, (p) => setLoadingProgress(p))
        .then((data) => {
          setFileDataUrl(data);
          setIsLoadingFileData(false);
        })
        .catch((err) => {
          console.warn('Failed to load file chunks from cloud:', err);
          setIsLoadingFileData(false);
        });
    } else {
      setFileDataUrl(null);
      setIsLoadingFileData(false);
    }
  }, [document.id, document.fileDataUrl, googleEmbedUrl, document.content]);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(document.id, newComment.trim());
    setNewComment('');
  };

  const handleSendReply = (parentCommentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onAddReply) return;
    onAddReply(document.id, parentCommentId, replyText.trim());
    setReplyText('');
    setReplyingToId(null);
  };

  const handleConfirmApprove = () => {
    onApprove(document.id, decisionNotes);
    setShowApproveDialog(false);
  };

  const handleConfirmReject = () => {
    onReject(document.id, decisionNotes);
    setShowRejectDialog(false);
  };

  const handleConfirmDelete = () => {
    if (onDeleteDocument) {
      onDeleteDocument(document.id);
    }
    setShowDeleteDialog(false);
    onNavigate('department_hub', document.departmentId);
  };

  const comments: DocumentComment[] = document.comments || [];

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-24 md:pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="pt-2 pb-3 flex items-center gap-1.5 text-xs text-[#5D4037]">
        <button onClick={() => onNavigate('home')} className="hover:text-[#006054] transition-colors">
          Home
        </button>
        <span className="material-symbols-outlined text-[14px] text-[#bec9c5]">chevron_right</span>
        <button onClick={() => onNavigate('department_hub', document.departmentId)} className="hover:text-[#006054] transition-colors">
          {document.departmentName}
        </button>
        <span className="material-symbols-outlined text-[14px] text-[#bec9c5]">chevron_right</span>
        <span className="text-[#6e7976]">{document.type}</span>
        <span className="material-symbols-outlined text-[14px] text-[#bec9c5]">chevron_right</span>
        <span className="text-[#1c1c18] font-bold truncate max-w-[200px]">{document.name}</span>
      </nav>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex bg-white rounded-xl p-1 border border-[#bec9c5]/60 mb-4 shadow-xs">
        <button
          onClick={() => setActiveTab('document')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'document' ? 'bg-[#006054] text-white shadow-xs' : 'text-[#5D4037]'
          }`}
        >
          Document
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'discussion' ? 'bg-[#006054] text-white shadow-xs' : 'text-[#5D4037]'
          }`}
        >
          <span>Discussion</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{comments.length}</span>
        </button>
      </div>

      {/* Main Split-Pane Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Document Viewer */}
        <div
          className={`lg:col-span-8 flex flex-col gap-4 ${
            activeTab === 'discussion' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Document Toolbar */}
          <div className="bg-white rounded-2xl p-3 md:px-5 md:py-3.5 border border-[#bec9c5]/40 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[22px] fill-icon">picture_as_pdf</span>
              <span className="font-semibold text-xs md:text-sm text-[#1c1c18] truncate max-w-[220px] md:max-w-[340px]">
                {document.filename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-[#f6f3ec] rounded-lg px-2 py-1 border border-[#bec9c5]/60 text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="p-1 hover:text-[#006054]"
                  title="Zoom out"
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span className="px-2 font-semibold text-[#5D4037]">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="p-1 hover:text-[#006054]"
                  title="Zoom in"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (document.fileDataUrl) {
                    const a = window.document.createElement('a');
                    a.href = document.fileDataUrl;
                    a.download = document.filename;
                    a.click();
                  } else if (document.content) {
                    const htmlContent = `
                      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                      <head><meta charset="utf-8"/><title>${document.name}</title></head>
                      <body style="font-family:Arial,sans-serif; padding:20px; color:#1c1c18;">
                        <h1 style="color:#006054;">${document.content.title}</h1>
                        <h3>${document.content.subtitle}</h3>
                        <p><strong>Department:</strong> ${document.departmentName} | <strong>Submitted by:</strong> ${document.uploadedBy.name} (${document.uploadDate})</p>
                        <hr style="border:none; border-top:1px solid #ccc; margin:20px 0;"/>
                        <p style="font-size:14px; line-height:1.6;">${document.content.description}</p>
                        ${document.content.sections.map(s => `<h2 style="color:#006054; margin-top:20px;">${s.title}</h2><p style="font-size:14px; line-height:1.6;">${s.body}</p>`).join('')}
                      </body>
                      </html>
                    `;
                    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    const baseName = document.filename.includes('.') ? document.filename.substring(0, document.filename.lastIndexOf('.')) : document.filename;
                    a.download = `${baseName}.doc`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } else {
                    const textContent = `${document.name}\nDepartment: ${document.departmentName}\nUploaded by: ${document.uploadedBy.name}\nDate: ${document.uploadDate}\n\n[Student Council Official Document]`;
                    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = document.filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#006054] hover:bg-[#1F7A6C] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download ({document.fileSize})</span>
              </button>

              {onDeleteDocument && (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete this document"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ba1a1a]/10 hover:bg-[#ba1a1a]/20 text-[#ba1a1a] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Rendered Document Sheet / Viewer */}
          <div
            className="bg-white rounded-2xl p-6 md:p-10 border border-[#bec9c5]/40 shadow-md transition-all custom-scrollbar overflow-x-auto min-h-[600px]"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Google Docs, Google Sheets, or Cloud Workspace Embed Viewer */}
            {googleEmbedUrl || document.driveWebViewLink ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-[#e5e2db] pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-2xl ${
                      document.format === 'gsheet' ? 'text-[#107c41]' : document.format === 'gdoc' ? 'text-[#185abd]' : 'text-[#006054]'
                    }`}>
                      {document.format === 'gsheet' ? 'table_chart' : document.format === 'gdoc' ? 'article' : 'cloud_done'}
                    </span>
                    <div>
                      <h2 className="text-base md:text-lg font-bold text-[#1c1c18]">{document.name}</h2>
                      <p className="text-xs text-[#6e7976]">
                        {document.format === 'gsheet' ? 'Google Sheet Spreadsheet' : document.format === 'gdoc' ? 'Google Docs Document' : 'Google Workspace Document'} • Live Cloud Preview
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {document.driveWebViewLink && (
                      <a
                        href={document.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-[#006054] hover:bg-[#1F7A6C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                      >
                        <span>Open in Google Workspace</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Interactive Loading System & Iframe Viewer */}
                <div className="relative w-full h-[650px] bg-[#FAF7F0] rounded-2xl border border-[#bec9c5]/60 overflow-hidden shadow-inner">
                  {isIframeLoading && (
                    <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 space-y-4">
                      <div className="w-12 h-12 border-3 border-[#006054] border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-center space-y-1">
                        <p className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#1c1c18]">
                          Loading {document.format === 'gsheet' ? 'Google Sheet' : 'Google Doc'}...
                        </p>
                        <p className="text-xs text-[#6e7976]">
                          Fetching latest updates and real-time edits from Google Workspace.
                        </p>
                      </div>
                      <div className="w-48 h-1.5 bg-[#e5e2db] rounded-full overflow-hidden">
                        <div className="h-full bg-[#006054] animate-pulse w-3/4"></div>
                      </div>
                    </div>
                  )}

                  <iframe
                    src={googleEmbedUrl || document.driveWebViewLink}
                    className="w-full h-full border-none"
                    title={document.name}
                    onLoad={() => setIsIframeLoading(false)}
                    onError={() => {
                      setIsIframeLoading(false);
                      setIframeError(true);
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />

                  {/* Fallback Banner if Embed is Protected by Org CORS */}
                  {iframeError && (
                    <div className="absolute inset-0 bg-white z-30 flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <span className="material-symbols-outlined text-4xl text-[#006054]">open_in_browser</span>
                      <h4 className="font-bold text-sm text-[#1c1c18]">Direct Workspace Access</h4>
                      <p className="text-xs text-[#6e7976] max-w-md">
                        This Google Sheet/Doc is secured. Click below to view and edit directly in Google Workspace.
                      </p>
                      {document.driveWebViewLink && (
                        <a
                          href={document.driveWebViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#006054] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <span>Open Google Sheet / Doc</span>
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : isLoadingFileData ? (
              <div className="p-12 md:p-16 bg-[#f6f3ec]/50 rounded-2xl border border-[#bec9c5]/40 text-center space-y-4 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full border-3 border-[#006054]/20 border-t-[#006054] animate-spin"></div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#1c1c18]">Retrieving File from Cloud...</h3>
                  <p className="text-xs text-[#6e7976] mt-1">Synchronizing shared document across devices</p>
                </div>
                {loadingProgress > 0 && (
                  <div className="w-48 bg-[#e5e2db] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#006054] h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
                  </div>
                )}
              </div>
            ) : fileDataUrl ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#e5e2db] pb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1c1c18]">{document.name}</h2>
                    <p className="text-xs text-[#6e7976]">Uploaded file: {document.filename} ({document.fileSize})</p>
                  </div>
                  <button
                    onClick={() => {
                      const a = window.document.createElement('a');
                      a.href = fileDataUrl;
                      a.download = document.filename;
                      a.click();
                    }}
                    className="px-4 py-2 bg-[#006054] hover:bg-[#1F7A6C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download File
                  </button>
                </div>

                {document.format === 'png' || document.format === 'jpg' || document.format === 'jpeg' ? (
                  <div className="flex justify-center bg-[#f6f3ec]/60 p-4 rounded-2xl border border-[#bec9c5]/40">
                    <img
                      src={fileDataUrl}
                      alt={document.name}
                      className="max-h-[600px] object-contain rounded-xl shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : document.format === 'pdf' ? (
                  <div className="w-full h-[650px] bg-[#f6f3ec]/40 rounded-2xl border border-[#bec9c5]/40 overflow-hidden flex flex-col items-center justify-center">
                    <iframe
                      src={fileDataUrl}
                      className="w-full h-full rounded-xl"
                      title={document.name}
                    />
                  </div>
                ) : (
                  <div className="p-8 bg-[#f6f3ec]/40 rounded-2xl border border-[#bec9c5]/40 text-center space-y-4">
                    <span className="material-symbols-outlined text-5xl text-[#006054]">description</span>
                    <div>
                      <p className="font-bold text-sm text-[#1c1c18]">{document.filename}</p>
                      <p className="text-xs text-[#6e7976] mt-1">Uploaded document ready for viewing and download.</p>
                    </div>
                    <button
                      onClick={() => {
                        const a = window.document.createElement('a');
                        a.href = fileDataUrl;
                        a.download = document.filename;
                        a.click();
                      }}
                      className="px-5 py-2.5 bg-[#006054] hover:bg-[#1F7A6C] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download & Open File
                    </button>
                  </div>
                )}
              </div>
            ) : document.content ? (
              <article className="max-w-2xl mx-auto space-y-6 text-[#1c1c18]">
                {/* Header */}
                <div className="border-b border-[#e5e2db] pb-5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#006054] block mb-1">
                    {document.departmentName} • Official Proposal
                  </span>
                  <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-extrabold text-[#1c1c18] tracking-tight">
                    {document.content.title}
                  </h1>
                  <h2 className="text-base text-[#5D4037] font-semibold mt-1">
                    {document.content.subtitle}
                  </h2>
                  <p className="text-xs text-[#6e7976] mt-2">
                    Submitted by {document.uploadedBy.name} ({document.uploadedBy.role || 'Executive'}) on {document.uploadDate}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-[#3e4946]">
                  {document.content.description}
                </p>

                {/* Sections */}
                {document.content.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3 pt-2">
                    <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#1c1c18] border-l-3 border-[#006054] pl-2.5">
                      {section.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#3e4946]">
                      {section.body}
                    </p>

                    {/* Moodboard Images */}
                    {section.images && section.images.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {section.images.map((img, i) => (
                          <div key={i} className="rounded-xl overflow-hidden border border-[#bec9c5]/60 shadow-xs group bg-[#1c1c18]">
                            <img
                              src={img.url}
                              alt={img.alt}
                              referrerPolicy="no-referrer"
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="p-2 bg-[#f6f3ec] text-[11px] text-[#5D4037] italic">
                              Visual concept {i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Table if any */}
                    {section.table && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#bec9c5]/60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#f0eee7] text-[#5D4037] font-bold">
                            <tr>
                              {section.table.headers.map((h, hi) => (
                                <th key={hi} className="p-3 border-b border-[#e5e2db]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0eee7]">
                            {section.table.rows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-[#FAF7F0]">
                                <td className="p-3 text-[#1c1c18]">{row.category}</td>
                                <td className="p-3 font-semibold text-[#006054]">{row.cost}</td>
                              </tr>
                            ))}
                            {section.table.total && (
                              <tr className="bg-[#f0eee7]/80 font-bold">
                                <td className="p-3 text-[#1c1c18]">Total Projected Budget</td>
                                <td className="p-3 text-[#006054] text-sm">{section.table.total}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </article>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#006054]/10 text-[#006054] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[36px]">description</span>
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#1c1c18]">
                    {document.name}
                  </h3>
                  <p className="text-xs text-[#6e7976] mt-1 max-w-sm">
                    {document.filename} is ready for review and council sign-off.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (fileDataUrl) {
                      const a = window.document.createElement('a');
                      a.href = fileDataUrl;
                      a.download = document.filename;
                      a.click();
                    } else {
                      setIsLoadingFileData(true);
                      loadDocumentFileData(document.id, (p) => setLoadingProgress(p)).then((d) => {
                        setFileDataUrl(d);
                        setIsLoadingFileData(false);
                        if (d) {
                          const a = window.document.createElement('a');
                          a.href = d;
                          a.download = document.filename;
                          a.click();
                        }
                      });
                    }
                  }}
                  className="px-5 py-2.5 bg-[#006054] hover:bg-[#1F7A6C] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download File ({document.fileSize})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right / Sidebar: Metadata, Discussion Thread & Actions */}
        <div
          className={`lg:col-span-4 flex flex-col gap-4 ${
            activeTab === 'document' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Metadata & Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#bec9c5]/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#006054]/10 text-[#006054] text-xs font-bold uppercase tracking-wider">
                {document.departmentName}
              </span>
              {document.status === 'APPROVED' ? (
                <span className="px-2.5 py-1 bg-[#006054]/10 text-[#006054] rounded-full text-xs font-bold uppercase border border-[#006054]/30">
                  Approved
                </span>
              ) : document.status === 'REJECTED' ? (
                <span className="px-2.5 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-xs font-bold uppercase">
                  Rejected
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-[#fed65b]/40 text-[#745c00] rounded-full text-xs font-bold uppercase border border-[#fed65b]">
                  Pending Review
                </span>
              )}
            </div>

            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#1c1c18]">
                {document.name}
              </h2>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#e5e2db]">
                {document.uploadedBy.avatarUrl ? (
                  <img
                    src={document.uploadedBy.avatarUrl}
                    alt={document.uploadedBy.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-[#bec9c5]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#fed65b] text-[#745c00] flex items-center justify-center font-bold text-xs">
                    {document.uploadedBy.initials}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-[#1c1c18]">
                    Submitted by {document.uploadedBy.name}
                  </p>
                  <p className="text-[11px] text-[#6e7976]">
                    {document.uploadedBy.role || 'Council Member'} • {document.uploadDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Discussion Thread Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#bec9c5]/40 shadow-xs flex-1 flex flex-col">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#1c1c18] mb-3 flex items-center justify-between">
              <span>Discussion & Feedback</span>
              <span className="text-xs font-semibold text-[#6e7976]">{comments.length} comments</span>
            </h3>

            {/* Comments Stream */}
            <div className="space-y-3.5 max-h-80 overflow-y-auto custom-scrollbar pr-1 flex-1">
              {comments.length === 0 ? (
                <p className="text-xs text-[#6e7976] italic text-center py-6">
                  No comments yet. Be the first to leave feedback on this proposal.
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 bg-[#FAF7F0] rounded-xl border border-[#e5e2db] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.author}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#006054] text-white text-[10px] font-bold flex items-center justify-center">
                            {c.initials}
                          </div>
                        )}
                        <span className="text-xs font-bold text-[#1c1c18]">{c.author}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#fed65b]/40 text-[#745c00] rounded font-semibold">
                          {c.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6e7976]">{c.timeAgo}</span>
                    </div>
                    <p className="text-xs text-[#3e4946] leading-relaxed pl-8">
                      {c.text}
                    </p>

                    {/* Reply Action & Nested Replies */}
                    <div className="pl-8 pt-1 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setReplyingToId(replyingToId === c.id ? null : c.id);
                          setReplyText('');
                        }}
                        className="text-[11px] font-semibold text-[#006054] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">reply</span>
                        <span>Reply {c.replies && c.replies.length > 0 ? `(${c.replies.length})` : ''}</span>
                      </button>
                    </div>

                    {/* Nested Replies Stream */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="pl-8 mt-2.5 space-y-2 border-l-2 border-[#006054]/20 ml-3">
                        {c.replies.map((reply) => (
                          <div key={reply.id} className="p-2.5 bg-white rounded-lg border border-[#e5e2db] space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {reply.avatarUrl ? (
                                  <img
                                    src={reply.avatarUrl}
                                    alt={reply.author}
                                    referrerPolicy="no-referrer"
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#006054] text-white text-[9px] font-bold flex items-center justify-center">
                                    {reply.initials}
                                  </div>
                                )}
                                <span className="text-[11px] font-bold text-[#1c1c18]">{reply.author}</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-[#fed65b]/40 text-[#745c00] rounded font-semibold">
                                  {reply.role}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#6e7976]">{reply.timeAgo}</span>
                            </div>
                            <p className="text-[11px] text-[#3e4946] leading-relaxed pl-7">
                              {reply.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {replyingToId === c.id && (
                      <form onSubmit={(e) => handleSendReply(c.id, e)} className="pl-8 mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder={`Reply to ${c.author}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 text-xs bg-white border border-[#bec9c5]/60 rounded-xl px-3 py-1.5 text-[#1c1c18] outline-none focus:border-[#006054]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="px-3 py-1.5 bg-[#006054] text-white rounded-xl text-xs font-bold hover:bg-[#1F7A6C] disabled:opacity-40 transition-opacity cursor-pointer"
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-2 py-1.5 text-[#6e7976] hover:bg-[#e5e2db] rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input or Viewer Notice */}
            {isViewer ? (
              <div className="mt-4 pt-3 border-t border-[#e5e2db] text-center p-3 bg-[#FAF7F0] rounded-xl text-xs text-[#6e7976] font-medium">
                SC Preview is in read-only viewer mode (comments disabled)
              </div>
            ) : (
              <form onSubmit={handleSendComment} className="mt-4 pt-3 border-t border-[#e5e2db] flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment or note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 text-xs bg-[#f6f3ec] border border-[#bec9c5]/60 rounded-xl px-3 py-2 text-[#1c1c18] outline-none focus:border-[#006054]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-[#006054] text-white rounded-xl text-xs font-bold hover:bg-[#1F7A6C] disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  Post
                </button>
              </form>
            )}
          </div>

          {/* Decision Actions (Approve / Reject) or Viewer Notice */}
          <div className="bg-white rounded-2xl p-4 border border-[#bec9c5]/40 shadow-xs flex items-center gap-3">
            {isViewer ? (
              <div className="w-full text-center py-2 px-3 bg-[#FAF7F0] rounded-xl text-xs text-[#6e7976] font-semibold flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Viewer Mode: Approvals Restricted</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => setShowApproveDialog(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#006054] hover:bg-[#1F7A6C] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#006054]/20 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Approve</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bec9c5]/40 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006054]/10 text-[#006054] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#1c1c18]">
                  Approve Proposal
                </h3>
                <p className="text-xs text-[#6e7976]">This will record official council approval for this document.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5D4037] mb-1">
                Approval Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approved with recommended decor adjustments..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full text-xs p-3 bg-[#f6f3ec] border border-[#bec9c5]/60 rounded-xl outline-none focus:border-[#006054]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e7976] hover:bg-[#f6f3ec]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-5 py-2.5 rounded-xl bg-[#006054] hover:bg-[#1F7A6C] text-white font-bold text-xs uppercase tracking-wider shadow-sm"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bec9c5]/40 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#1c1c18]">
                  Reject Proposal
                </h3>
                <p className="text-xs text-[#6e7976]">Please provide feedback on why this proposal is returned.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5D4037] mb-1">
                Reason / Feedback <span className="text-[#ba1a1a]">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain the reason for rejection or required revisions..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full text-xs p-3 bg-[#f6f3ec] border border-[#bec9c5]/60 rounded-xl outline-none focus:border-[#ba1a1a]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e7976] hover:bg-[#f6f3ec]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!decisionNotes.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#bec9c5]/50 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <div className="w-10 h-10 rounded-2xl bg-[#ba1a1a]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#1c1c18]">
                  Delete Document?
                </h3>
                <p className="text-xs text-[#6e7976]">Permanently remove this file from the hub.</p>
              </div>
            </div>

            <div className="p-3 bg-[#f6f3ec] rounded-2xl border border-[#e5e2db] space-y-1">
              <p className="text-xs font-bold text-[#1c1c18] truncate">{document.name}</p>
              <p className="text-[11px] text-[#6e7976]">{document.filename} • {document.fileSize}</p>
            </div>

            <p className="text-xs text-[#5D4037]">
              Are you sure you want to permanently delete <strong>"{document.name}"</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5D4037] hover:bg-[#f6f3ec] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
