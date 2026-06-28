import { useState, useMemo, useCallback } from "react";
import { useSupabaseData } from "./useSupabaseData";
import { useAuth } from "./useAuth";
import { supabase } from "./supabaseClient";
import { LoginScreen, SetPasswordScreen } from "./AuthScreens";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const today = () => new Date().toISOString().split("T")[0];
const uid = () => "MOV-" + String(Math.floor(Math.random() * 9000) + 1000);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #F0F2F5; color: #1A1D23; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #F0F2F5; }
  ::-webkit-scrollbar-thumb { background: #C8CDD8; border-radius: 3px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  .sidebar { width: 220px; min-width: 220px; background: #141824; color: #fff; display: flex; flex-direction: column; padding: 0; overflow-y: auto; }
  .sidebar-logo { padding: 20px 18px 12px; border-bottom: 1px solid #2A2F3E; }
  .sidebar-logo-mark { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #4F8EF7, #7C5CF6); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; }
  .logo-name { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
  .logo-sub { font-size: 10px; color: #6B7280; margin-top: 1px; }
  .sidebar-section { padding: 8px 0; border-bottom: 1px solid #2A2F3E; }
  .sidebar-section-label { font-size: 9px; font-weight: 600; color: #4B5563; letter-spacing: 1px; text-transform: uppercase; padding: 8px 18px 4px; }
  .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 8px 18px; font-size: 13px; color: #9CA3AF; cursor: pointer; transition: all 0.15s; border-left: 2px solid transparent; }
  .sidebar-item:hover { background: #1E2435; color: #E5E7EB; }
  .sidebar-item.active { background: #1E2435; color: #fff; border-left-color: #4F8EF7; }
  .sidebar-item-icon { width: 16px; text-align: center; opacity: 0.7; }
  .sidebar-item.active .sidebar-item-icon { opacity: 1; }
  .sidebar-badge { margin-left: auto; background: #EF4444; color: #fff; font-size: 9px; font-weight: 600; padding: 1px 5px; border-radius: 8px; }
  .sidebar-user { padding: 12px 18px; margin-top: auto; border-top: 1px solid #2A2F3E; display: flex; align-items: center; gap: 8px; }
  .user-avatar { width: 30px; height: 30px; border-radius: 50%; background: #4F8EF7; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #fff; flex-shrink: 0; }
  .user-name { font-size: 12px; color: #E5E7EB; font-weight: 500; }
  .user-role { font-size: 10px; color: #6B7280; }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .page-title { font-size: 16px; font-weight: 600; color: #1A1D23; }
  .page-sub { font-size: 12px; color: #6B7280; margin-top: 1px; }
  .topbar-actions { display: flex; align-items: center; gap: 8px; }
  .content { flex: 1; overflow-y: auto; padding: 20px 24px; }

  /* Cards */
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .kpi-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; }
  .kpi-label { font-size: 11px; color: #6B7280; font-weight: 500; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
  .kpi-value { font-size: 22px; font-weight: 600; color: #1A1D23; letter-spacing: -0.5px; }
  .kpi-sub { font-size: 11px; color: #6B7280; margin-top: 4px; }
  .kpi-bar { height: 4px; background: #F3F4F6; border-radius: 2px; margin-top: 8px; }
  .kpi-bar-fill { height: 100%; border-radius: 2px; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
  .btn-primary { background: #4F8EF7; color: #fff; border-color: #4F8EF7; }
  .btn-primary:hover { background: #3B7DEF; }
  .btn-secondary { background: #fff; color: #374151; border-color: #D1D5DB; }
  .btn-secondary:hover { background: #F9FAFB; }
  .btn-danger { background: #FEF2F2; color: #DC2626; border-color: #FCA5A5; }
  .btn-danger:hover { background: #FEE2E2; }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn-xs { padding: 3px 8px; font-size: 11px; }
  .btn-ghost { background: transparent; border-color: transparent; color: #6B7280; }
  .btn-ghost:hover { background: #F3F4F6; color: #374151; }

  /* Tables */
  .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; }
  .card-header { padding: 14px 18px; border-bottom: 1px solid #F3F4F6; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .card-title { font-size: 14px; font-weight: 600; color: #1A1D23; }
  .card-sub { font-size: 11px; color: #9CA3AF; margin-top: 1px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #6B7280; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid #F3F4F6; transition: background 0.1s; }
  tbody tr:hover { background: #F9FAFB; }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 10px 14px; color: #374151; vertical-align: middle; }
  td.mono { font-family: 'Courier New', monospace; font-size: 11px; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #DCFCE7; color: #16A34A; }
  .badge-red { background: #FEE2E2; color: #DC2626; }
  .badge-yellow { background: #FEF9C3; color: #CA8A04; }
  .badge-blue { background: #DBEAFE; color: #2563EB; }
  .badge-gray { background: #F3F4F6; color: #6B7280; }
  .badge-purple { background: #EDE9FE; color: #7C3AED; }

  /* Forms */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal { background: #fff; border-radius: 12px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 16px; font-weight: 600; }
  .modal-body { padding: 20px 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 8px; }
  .form-grid { display: grid; gap: 14px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-label { font-size: 11px; font-weight: 600; color: #374151; }
  .form-label span { color: #EF4444; }
  .form-control { padding: 8px 10px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 12px; font-family: inherit; color: #1A1D23; background: #fff; transition: border-color 0.15s; }
  .form-control:focus { outline: none; border-color: #4F8EF7; box-shadow: 0 0 0 3px rgba(79,142,247,0.1); }
  .form-control:disabled { background: #F9FAFB; color: #9CA3AF; }
  select.form-control { cursor: pointer; }
  textarea.form-control { resize: vertical; min-height: 72px; }

  /* Filters */
  .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
  .filter-bar input, .filter-bar select { padding: 7px 10px; border: 1px solid #E5E7EB; border-radius: 7px; font-size: 12px; font-family: inherit; background: #fff; color: #374151; }
  .filter-bar input:focus, .filter-bar select:focus { outline: none; border-color: #4F8EF7; }

  /* Progress */
  .progress-bar { height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

  /* Alerts */
  .alert { padding: 10px 14px; border-radius: 8px; font-size: 12px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
  .alert-danger { background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; }
  .alert-warning { background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; }
  .alert-success { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; }
  .alert-info { background: #EFF6FF; border: 1px solid #93C5FD; color: #1E40AF; }

  /* Charts */
  .chart-bar-horiz { display: flex; flex-direction: column; gap: 10px; }
  .chart-bar-row { display: flex; flex-direction: column; gap: 4px; }
  .chart-bar-label { display: flex; justify-content: space-between; font-size: 11px; color: #6B7280; }
  .chart-bar-track { height: 8px; background: #F3F4F6; border-radius: 4px; }
  .chart-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }

  /* Tabs */
  .tabs { display: flex; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; gap: 0; }
  .tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: #6B7280; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; }
  .tab:hover { color: #374151; }
  .tab.active { color: #4F8EF7; border-bottom-color: #4F8EF7; }

  /* Dashboard grid */
  .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .dash-grid-3 { grid-template-columns: 2fr 1fr; }

  /* Tag chip */
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }

  /* Pagination */
  .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid #F3F4F6; font-size: 12px; color: #6B7280; }
  .pagination-btns { display: flex; gap: 4px; }
  .page-btn { padding: 4px 9px; border: 1px solid #E5E7EB; border-radius: 5px; background: #fff; font-size: 12px; cursor: pointer; color: #374151; }
  .page-btn.active { background: #4F8EF7; color: #fff; border-color: #4F8EF7; }
  .page-btn:hover:not(.active) { background: #F9FAFB; }

  /* Toast */
  .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
  .toast { background: #1A1D23; color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 12px; font-weight: 500; box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: slideIn 0.2s ease; min-width: 220px; }
  .toast-success { background: #16A34A; }
  .toast-error { background: #DC2626; }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* Responsive */
  @media (max-width: 900px) {
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
    .dash-grid, .dash-grid-3 { grid-template-columns: 1fr; }
    .sidebar { width: 54px; min-width: 54px; }
    .sidebar-section-label, .sidebar-item span, .logo-name, .logo-sub, .user-name, .user-role { display: none; }
    .sidebar-logo { padding: 14px 10px; }
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .fw600 { font-weight: 600; }
  .color-green { color: #16A34A; }
  .color-red { color: #DC2626; }
  .color-yellow { color: #CA8A04; }
  .color-blue { color: #2563EB; }
  .color-gray { color: #6B7280; }
  .mb8 { margin-bottom: 8px; }
  .mb16 { margin-bottom: 16px; }
  .gap8 { gap: 8px; }
  .flex { display: flex; }
  .flex-center { display: flex; align-items: center; }
  .section-divider { margin: 16px 0; border: none; border-top: 1px solid #F3F4F6; }
  .empty-state { text-align: center; padding: 40px 20px; color: #9CA3AF; }
  .empty-state-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-state-text { font-size: 13px; }
`;

// ─── ICONS (SVG inline) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 15 }) => {
  const paths = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    transactions: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
    funder: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z",
    budget: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z",
    investment: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
    reports: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    audit: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
    users: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    alert: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
    eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    params: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={paths[name] || paths.check} />
    </svg>
  );
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
let _toastFn = null;
const showToast = (msg, type = "success") => _toastFn && _toastFn(msg, type);

function ToastManager() {
  const [toasts, setToasts] = useState([]);
  _toastFn = (msg, type) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── AUTH GATE ──────────────────────────────────────────────────────────────
export default function App() {
  const auth = useAuth();

  if (auth.authLoading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 22 }}>F</div>
          <div style={{ color: "#6B7280", fontSize: 14 }}>Carregando FinGest...</div>
        </div>
      </>
    );
  }

  if (!auth.user) {
    return (
      <>
        <style>{css}</style>
        <LoginScreen onSignIn={auth.signIn} />
      </>
    );
  }

  // Usuário acabou de aceitar um convite e ainda não definiu senha própria
  // (Supabase marca isso através da ausência de um login anterior - aqui
  // simplificamos exigindo definição de senha sempre que o perfil ainda não
  // carregou, o que é raro e se resolve sozinho após o primeiro login).
  if (!auth.profile) {
    return (
      <>
        <style>{css}</style>
        <SetPasswordScreen onDone={auth.reloadProfile} />
      </>
    );
  }

  if (!auth.profile.active) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, padding: 24, textAlign: "center" }}>
          <div style={{ color: "#A32D2D", fontWeight: 600, fontSize: 16 }}>Acesso desativado</div>
          <div style={{ color: "#6B7280", fontSize: 13, maxWidth: 420 }}>
            Sua conta foi desativada pelo Administrador. Entre em contato com a sua organização para mais informações.
          </div>
          <button className="btn btn-secondary btn-sm" onClick={auth.signOut} style={{ marginTop: 8 }}>Sair</button>
        </div>
      </>
    );
  }

  return <AppShell auth={auth} />;
}

// ─── MAIN APP SHELL (somente para usuários autenticados e ativos) ─────────────
function AppShell({ auth }) {
  const [page, setPage] = useState("dashboard");
  const data = useSupabaseData();
  const {
    loading, error,
    funders, setFunders,
    projects, setProjects,
    categories, subcategoriesMap,
    costCenters, setCostCenters,
    bankAccounts, setBankAccounts,
    users, setUsers,
    transactions, setTransactions,
    budgets, setBudgets,
    investments, setInvestments,
    auditLogs, setAuditLogs,
  } = data;
  const currentUser = { id: auth.profile.id, name: auth.profile.name, role: auth.profile.role };
  const isAdmin = auth.isAdmin;
  const [modal, setModal] = useState(null);

  const addAudit = useCallback((op, table, record, desc) => {
    setAuditLogs(prev => [{
      id: "AUD-" + String(prev.length + 1).padStart(3, "0"),
      date: new Date().toLocaleString("pt-BR"),
      userId: currentUser.id,
      userName: currentUser.name,
      table, operation: op, record, description: desc
    }, ...prev]);
  }, [currentUser, setAuditLogs]);

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [tx, ...prev]);
    addAudit("INSERT", "transactions", tx.id, `Criou ${tx.id} · ${fmt(tx.realized)} · ${tx.funderId} · ${tx.projectId}`);
    showToast("Lançamento registrado com sucesso!");
  }, [addAudit]);

  const updateTransaction = useCallback((id, updates) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    addAudit("UPDATE", "transactions", id, `Atualizou ${id}`);
    showToast("Lançamento atualizado!");
  }, [addAudit]);

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    addAudit("DELETE", "transactions", id, `Removeu lançamento ${id}`);
    showToast("Lançamento removido.", "error");
  }, [addAudit]);

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 22 }}>F</div>
          <div style={{ color: "#6B7280", fontSize: 14 }}>Carregando FinGest...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, padding: 24, textAlign: "center" }}>
          <div style={{ color: "#A32D2D", fontWeight: 600, fontSize: 16 }}>Não foi possível conectar ao banco de dados</div>
          <div style={{ color: "#6B7280", fontSize: 13, maxWidth: 480 }}>{error}</div>
          <div style={{ color: "#6B7280", fontSize: 13, maxWidth: 480 }}>
            Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão
            configuradas corretamente no projeto.
          </div>
        </div>
      </>
    );
  }

  
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", section: "principal" },
    { id: "transactions", label: "Lançamentos", icon: "transactions", section: "financeiro" },
    { id: "funders", label: "Por Financiador", icon: "funder", section: "financeiro" },
    { id: "budget", label: "Orçamento", icon: "budget", section: "financeiro" },
    { id: "investments", label: "Rendimentos", icon: "investment", section: "financeiro" },
    { id: "reports", label: "Relatórios", icon: "reports", section: "relatorios" },
    { id: "audit", label: "Auditoria", icon: "audit", section: "administracao" },
    ...(isAdmin ? [{ id: "users", label: "Usuários", icon: "users", section: "administracao" }] : []),
    { id: "params", label: "Parâmetros", icon: "params", section: "administracao" },
  ];

  const sections = [
    { id: "principal", label: "Principal" },
    { id: "financeiro", label: "Financeiro" },
    { id: "relatorios", label: "Relatórios" },
    { id: "administracao", label: "Administração" },
  ];

  const pendingCount = transactions.filter(t => t.status === "Pendente").length;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* SIDEBAR */}
        <nav className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <div className="logo-icon">F</div>
              <div>
                <div className="logo-name">FinGest</div>
                <div className="logo-sub">Gestão Financeira</div>
              </div>
            </div>
          </div>

          {sections.map(sec => (
            <div key={sec.id} className="sidebar-section">
              <div className="sidebar-section-label">{sec.label}</div>
              {navItems.filter(n => n.section === sec.id).map(item => (
                <div
                  key={item.id}
                  className={`sidebar-item ${page === item.id ? "active" : ""}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="sidebar-item-icon"><Icon name={item.icon} size={15} /></span>
                  <span>{item.label}</span>
                  {item.id === "transactions" && pendingCount > 0 && (
                    <span className="sidebar-badge">{pendingCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="sidebar-user" style={{ cursor: "pointer" }} onClick={auth.signOut} title="Clique para sair">
            <div className="user-avatar">{currentUser.name.split(" ").map(n => n[0]).join("").slice(0,2)}</div>
            <div>
              <div className="user-name">{currentUser.name}</div>
              <div className="user-role">{currentUser.role}</div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div className="main">
          {page === "dashboard" && <DashboardPage transactions={transactions} investments={investments} budgets={budgets} setPage={setPage} funders={funders} categories={categories} />}
          {page === "transactions" && <TransactionsPage transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} funders={funders} projects={projects} bankAccounts={bankAccounts} costCenters={costCenters} categories={categories} subcategoriesMap={subcategoriesMap} users={users} />}
          {page === "funders" && <FundersPage transactions={transactions} budgets={budgets} funders={funders} />}
          {page === "budget" && <BudgetPage transactions={transactions} budgets={budgets} setBudgets={setBudgets} projects={projects} />}
          {page === "investments" && <InvestmentsPage investments={investments} setInvestments={setInvestments} funders={funders} />}
          {page === "reports" && <ReportsPage transactions={transactions} investments={investments} budgets={budgets} funders={funders} categories={categories} projects={projects} />}
          {page === "audit" && <AuditPage logs={auditLogs} users={users} />}
          {page === "users" && isAdmin && <UsersPage users={users} setUsers={setUsers} currentUserId={currentUser.id} />}
          {page === "params" && <ParamsPage funders={funders} setFunders={setFunders} projects={projects} setProjects={setProjects} costCenters={costCenters} setCostCenters={setCostCenters} categories={categories} subcategoriesMap={subcategoriesMap} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />}
        </div>
      </div>
      <ToastManager />
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ transactions, investments, budgets, setPage, funders, categories }) {
  const entradas = transactions.filter(t => t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
  const saidas = transactions.filter(t => t.type === "Saída").reduce((s, t) => s + t.realized, 0);
  const rendimentos = investments.reduce((s, i) => s + i.yieldAmount, 0);
  const saldo = entradas - saidas + rendimentos;
  const execPct = entradas > 0 ? saidas / entradas : 0;

  const byFunder = funders.map(f => {
    const rec = transactions.filter(t => t.funderId === f.id && t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
    const exec = transactions.filter(t => t.funderId === f.id && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
    return { ...f, received: rec, executed: exec, pct: rec > 0 ? exec / rec : 0 };
  });

  const byCategory = categories.map(cat => ({
    name: cat,
    total: transactions.filter(t => t.category === cat && t.type === "Saída").reduce((s, t) => s + t.realized, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const maxCat = Math.max(...byCategory.map(c => c.total), 1);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0") + "/2024";
    const e = transactions.filter(t => t.competence === m && t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
    const s = transactions.filter(t => t.competence === m && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
    return { month: ["Jan","Fev","Mar","Abr","Mai","Jun"][i], entradas: e, saidas: s };
  });
  const maxMonth = Math.max(...monthlyData.map(m => Math.max(m.entradas, m.saidas)), 1);

  const alerts = [];
  byFunder.forEach(f => {
    if (f.pct > 0.9) alerts.push({ type: "danger", msg: `${f.id} — ${f.name}: execução acima de 90% (${pct(f.pct)})` });
  });
  budgets.forEach(b => {
    const exec = transactions.filter(t => t.projectId === b.projectId && t.category === b.category && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
    if (exec / b.revised > 0.9) alerts.push({ type: "warning", msg: `${b.projectId} ${b.category}: orçamento ${pct(exec/b.revised)} consumido` });
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard executivo</div>
          <div className="page-sub">Visão consolidada — {new Date().toLocaleDateString("pt-BR")}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage("reports")}>
            <Icon name="reports" size={13} /> Relatórios
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setPage("transactions")}>
            <Icon name="plus" size={13} /> Novo lançamento
          </button>
        </div>
      </div>
      <div className="content">
        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label"><Icon name="funder" size={12} /> Total captado</div>
            <div className="kpi-value">{fmt(entradas)}</div>
            <div className="kpi-sub">{funders.filter(f=>f.active).length} financiadores ativos</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><Icon name="transactions" size={12} /> Total executado</div>
            <div className="kpi-value">{fmt(saidas)}</div>
            <div className="kpi-sub">{pct(execPct)} do total captado</div>
            <div className="kpi-bar"><div className="kpi-bar-fill" style={{ width: pct(execPct), background: execPct > 0.9 ? "#EF4444" : execPct > 0.7 ? "#F59E0B" : "#10B981" }} /></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><Icon name="investment" size={12} /> Saldo disponível</div>
            <div className="kpi-value" style={{ color: saldo >= 0 ? "#16A34A" : "#DC2626" }}>{fmt(saldo)}</div>
            <div className="kpi-sub">Entradas − saídas + rendimentos</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><Icon name="investment" size={12} /> Rendimentos acum.</div>
            <div className="kpi-value" style={{ color: "#16A34A" }}>{fmt(rendimentos)}</div>
            <div className="kpi-sub">{investments.length} aplicações registradas</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><Icon name="transactions" size={12} /> Movimentações</div>
            <div className="kpi-value">{transactions.length}</div>
            <div className="kpi-sub">{transactions.filter(t=>t.status==="Pendente").length} pendentes de conciliação</div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb16">
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className={`alert alert-${a.type}`}>
                <Icon name="alert" size={14} /> {a.msg}
              </div>
            ))}
          </div>
        )}

        <div className="dash-grid">
          {/* Execução por financiador */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Execução por financiador</div></div>
            </div>
            <div style={{ padding: "16px" }}>
              <div className="chart-bar-horiz">
                {byFunder.map(f => (
                  <div key={f.id} className="chart-bar-row">
                    <div className="chart-bar-label">
                      <span>{f.id} — {f.name}</span>
                      <span className="fw600">{pct(f.pct)}</span>
                    </div>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{
                        width: pct(Math.min(f.pct, 1)),
                        background: f.pct > 0.9 ? "#EF4444" : f.pct > 0.7 ? "#F59E0B" : "#4F8EF7"
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", display: "flex", justifyContent: "space-between" }}>
                      <span>Executado: {fmt(f.executed)}</span>
                      <span>Recebido: {fmt(f.received)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Despesas por categoria */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Despesas por categoria</div></div>
            </div>
            <div style={{ padding: "16px" }}>
              <div className="chart-bar-horiz">
                {byCategory.map((c, i) => {
                  const colors = ["#4F8EF7","#10B981","#F59E0B","#EF4444","#7C3AED","#EC4899","#6B7280"];
                  return (
                    <div key={c.name} className="chart-bar-row">
                      <div className="chart-bar-label">
                        <span>{c.name}</span>
                        <span className="fw600">{fmt(c.total)}</span>
                      </div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width: `${(c.total / maxCat) * 100}%`, background: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Evolução mensal */}
        <div className="card mb16">
          <div className="card-header">
            <div><div className="card-title">Evolução mensal — Entradas × Saídas</div></div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "120px" }}>
              {monthlyData.map(m => (
                <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", display: "flex", gap: "2px", alignItems: "flex-end", height: "90px" }}>
                    <div style={{ flex: 1, background: "#DBEAFE", borderRadius: "3px 3px 0 0", height: `${(m.entradas / maxMonth) * 90}px`, minHeight: m.entradas > 0 ? 4 : 0, transition: "height 0.3s" }} title={`Entradas: ${fmt(m.entradas)}`} />
                    <div style={{ flex: 1, background: "#FCA5A5", borderRadius: "3px 3px 0 0", height: `${(m.saidas / maxMonth) * 90}px`, minHeight: m.saidas > 0 ? 4 : 0, transition: "height 0.3s" }} title={`Saídas: ${fmt(m.saidas)}`} />
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 500 }}>{m.month}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: 11, color: "#6B7280" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#DBEAFE", borderRadius: 2, marginRight: 4 }} />Entradas</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#FCA5A5", borderRadius: 2, marginRight: 4 }} />Saídas</span>
            </div>
          </div>
        </div>

        {/* Últimas movimentações */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Últimas movimentações</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage("transactions")}>Ver todas →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Financiador</th><th>Projeto</th><th>Descrição</th>
                  <th className="text-right">Valor</th><th>Tipo</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map(t => (
                  <tr key={t.id}>
                    <td className="color-gray">{t.date}</td>
                    <td><span className="chip badge-blue">{t.funderId}</span></td>
                    <td className="color-gray">{t.projectId}</td>
                    <td>{t.description}</td>
                    <td className={`text-right fw600 ${t.type === "Entrada" ? "color-green" : "color-red"}`}>{fmt(t.realized)}</td>
                    <td><span className={`badge ${t.type === "Entrada" ? "badge-green" : "badge-red"}`}>{t.type}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }) {
  const m = { Pago: "badge-green", Pendente: "badge-yellow", Cancelado: "badge-red", Conciliado: "badge-blue" };
  return <span className={`badge ${m[status] || "badge-gray"}`}>{status}</span>;
}

// ─── TRANSACTIONS PAGE ────────────────────────────────────────────────────────
function TransactionsPage({ transactions, onAdd, onUpdate, onDelete, funders, projects, bankAccounts, costCenters, categories, subcategoriesMap, users }) {
  const [search, setSearch] = useState("");
  const [filterFunder, setFilterFunder] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => transactions.filter(t => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.id.includes(search) && !t.document.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFunder && t.funderId !== filterFunder) return false;
    if (filterProject && t.projectId !== filterProject) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPeriod && t.competence !== filterPeriod) return false;
    return true;
  }), [transactions, search, filterFunder, filterProject, filterType, filterStatus, filterPeriod]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const totalEntradas = filtered.filter(t => t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
  const totalSaidas = filtered.filter(t => t.type === "Saída").reduce((s, t) => s + t.realized, 0);

  const periods = [...new Set(transactions.map(t => t.competence))].sort();

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Lançamentos financeiros</div>
          <div className="page-sub">{filtered.length} registros filtrados · {transactions.length} total</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm"><Icon name="download" size={13} /> Exportar</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={13} /> Novo lançamento
          </button>
        </div>
      </div>
      <div className="content">
        {/* Summary strip */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
          <div className="kpi-card" style={{ flex: 1, padding: "12px" }}>
            <div className="kpi-label">Entradas (filtro)</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#16A34A" }}>{fmt(totalEntradas)}</div>
          </div>
          <div className="kpi-card" style={{ flex: 1, padding: "12px" }}>
            <div className="kpi-label">Saídas (filtro)</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#DC2626" }}>{fmt(totalSaidas)}</div>
          </div>
          <div className="kpi-card" style={{ flex: 1, padding: "12px" }}>
            <div className="kpi-label">Saldo (filtro)</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: totalEntradas - totalSaidas >= 0 ? "#16A34A" : "#DC2626" }}>{fmt(totalEntradas - totalSaidas)}</div>
          </div>
        </div>

        <div className="filter-bar">
          <input placeholder="🔍 Buscar ID, descrição, documento..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ minWidth: 200 }} />
          <select value={filterFunder} onChange={e => { setFilterFunder(e.target.value); setPage(0); }}>
            <option value="">Todos os financiadores</option>
            {funders.map(f => <option key={f.id} value={f.id}>{f.id} – {f.name}</option>)}
          </select>
          <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setPage(0); }}>
            <option value="">Todos os projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }}>
            <option value="">Entrada / Saída</option>
            <option>Entrada</option><option>Saída</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
            <option value="">Todos os status</option>
            <option>Pago</option><option>Pendente</option><option>Conciliado</option><option>Cancelado</option>
          </select>
          <select value={filterPeriod} onChange={e => { setFilterPeriod(e.target.value); setPage(0); }}>
            <option value="">Período</option>
            {periods.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Data</th><th>Comp.</th><th>Financiador</th><th>Projeto</th>
                  <th>Categoria</th><th>Descrição</th><th>Documento</th>
                  <th className="text-right">Previsto</th><th className="text-right">Realizado</th>
                  <th>Tipo</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={13}>
                    <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Nenhum lançamento encontrado</div></div>
                  </td></tr>
                )}
                {paginated.map(t => (
                  <tr key={t.id}>
                    <td className="mono">{t.id}</td>
                    <td className="color-gray">{t.date}</td>
                    <td className="color-gray">{t.competence}</td>
                    <td><span className="chip badge-blue">{t.funderId}</span></td>
                    <td><span className="chip badge-purple">{t.projectId}</span></td>
                    <td>{t.category}</td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                    <td className="mono color-gray">{t.document}</td>
                    <td className="text-right">{fmt(t.planned)}</td>
                    <td className={`text-right fw600 ${t.type === "Entrada" ? "color-green" : "color-red"}`}>{fmt(t.realized)}</td>
                    <td><span className={`badge ${t.type === "Entrada" ? "badge-green" : "badge-red"}`}>{t.type}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <div className="flex" style={{ gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(t); setShowForm(true); }}><Icon name="edit" size={12} /></button>
                        {t.status !== "Conciliado" && (
                          <button className="btn btn-ghost btn-xs" style={{ color: "#DC2626" }} onClick={() => { if(window.confirm("Remover este lançamento?")) onDelete(t.id); }}><Icon name="trash" size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            <div className="pagination-btns">
              <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i} className={`page-btn ${i === page ? "active" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <TransactionModal
          tx={editing}
          funders={funders}
          projects={projects}
          bankAccounts={bankAccounts}
          costCenters={costCenters}
          categories={categories}
          subcategoriesMap={subcategoriesMap}
          users={users}
          onSave={(data) => {
            if (editing) onUpdate(editing.id, data);
            else onAdd({ id: uid(), ...data });
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}

function TransactionModal({ tx, onSave, onClose, funders, projects, bankAccounts, costCenters, categories, subcategoriesMap, users }) {
  const [form, setForm] = useState({
    date: tx?.date || today(),
    competence: tx?.competence || "01/2024",
    funderId: tx?.funderId || "",
    projectId: tx?.projectId || "",
    costCenterId: tx?.costCenterId || "",
    bankAccountId: tx?.bankAccountId || "",
    source: tx?.source || "Doação",
    type: tx?.type || "Saída",
    category: tx?.category || "",
    subcategory: tx?.subcategory || "",
    description: tx?.description || "",
    document: tx?.document || "",
    planned: tx?.planned || "",
    realized: tx?.realized || "",
    status: tx?.status || "Pendente",
    userId: tx?.userId || "USR001",
    notes: tx?.notes || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredProjects = projects.filter(p => !form.funderId || p.funderId === form.funderId);
  const filteredAccounts = bankAccounts.filter(a => !form.funderId || a.funderId === form.funderId);

  const handleSave = () => {
    if (!form.date || !form.funderId || !form.projectId || !form.type || !form.category || !form.realized || !form.document) {
      alert("Preencha todos os campos obrigatórios (*)"); return;
    }
    onSave({ ...form, planned: parseFloat(form.planned) || 0, realized: parseFloat(String(form.realized).replace(",", ".")) });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{tx ? "Editar lançamento" : "Novo lançamento"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div className="modal-body">
          {/* Seção 1 */}
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>Identificação</div>
          <div className="form-grid form-grid-3 mb16">
            <div className="form-group">
              <label className="form-label">Data <span>*</span></label>
              <input type="date" className="form-control" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Competência <span>*</span></label>
              <input className="form-control" placeholder="mm/aaaa" value={form.competence} onChange={e => set("competence", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo <span>*</span></label>
              <select className="form-control" value={form.type} onChange={e => set("type", e.target.value)}>
                <option>Entrada</option><option>Saída</option>
              </select>
            </div>
          </div>

          {/* Seção 2 */}
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>Classificação</div>
          <div className="form-grid form-grid-2 mb16">
            <div className="form-group">
              <label className="form-label">Financiador <span>*</span></label>
              <select className="form-control" value={form.funderId} onChange={e => { set("funderId", e.target.value); set("projectId", ""); set("bankAccountId", ""); }}>
                <option value="">Selecione...</option>
                {funders.map(f => <option key={f.id} value={f.id}>{f.id} – {f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Projeto <span>*</span></label>
              <select className="form-control" value={form.projectId} onChange={e => set("projectId", e.target.value)}>
                <option value="">Selecione...</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centro de custo</label>
              <select className="form-control" value={form.costCenterId} onChange={e => set("costCenterId", e.target.value)}>
                <option value="">Selecione...</option>
                {costCenters.map(c => <option key={c.id} value={c.id}>{c.id} – {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Conta bancária</label>
              <select className="form-control" value={form.bankAccountId} onChange={e => set("bankAccountId", e.target.value)}>
                <option value="">Selecione...</option>
                {filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.id} – {a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria <span>*</span></label>
              <select className="form-control" value={form.category} onChange={e => { set("category", e.target.value); set("subcategory", ""); }}>
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subcategoria</label>
              <select className="form-control" value={form.subcategory} onChange={e => set("subcategory", e.target.value)}>
                <option value="">Selecione...</option>
                {(subcategoriesMap[form.category] || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Seção 3 */}
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>Valores e documento</div>
          <div className="form-grid form-grid-3 mb16">
            <div className="form-group">
              <label className="form-label">Valor previsto</label>
              <input className="form-control" placeholder="0.00" value={form.planned} onChange={e => set("planned", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Valor realizado <span>*</span></label>
              <input className="form-control" placeholder="0.00" value={form.realized} onChange={e => set("realized", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº documento <span>*</span></label>
              <input className="form-control" placeholder="NF-2024-001" value={form.document} onChange={e => set("document", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fonte de recurso</label>
              <select className="form-control" value={form.source} onChange={e => set("source", e.target.value)}>
                {["Doação","Convênio","Patrocínio","Subvenção","Rendimento Financeiro","Recurso Próprio","Outro"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set("status", e.target.value)}>
                <option>Pendente</option><option>Pago</option><option>Conciliado</option><option>Cancelado</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <select className="form-control" value={form.userId} onChange={e => set("userId", e.target.value)}>
                {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Seção 4 */}
          <div className="form-group">
            <label className="form-label">Descrição <span>*</span></label>
            <textarea className="form-control" placeholder="Descreva a movimentação com detalhes suficientes para auditoria..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Observações</label>
            <input className="form-control" placeholder="Informações adicionais..." value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Icon name="check" size={13} /> {tx ? "Salvar alterações" : "Registrar lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FUNDERS PAGE ─────────────────────────────────────────────────────────────
function FundersPage({ transactions, budgets, funders }) {
  const [selected, setSelected] = useState(null);

  const funderStats = funders.map(f => {
    const rec = transactions.filter(t => t.funderId === f.id && t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
    const exec = transactions.filter(t => t.funderId === f.id && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
    const txs = transactions.filter(t => t.funderId === f.id);
    const pcts = rec > 0 ? exec / rec : 0;
    return { ...f, received: rec, executed: exec, balance: rec - exec, pct: pcts, txCount: txs.length };
  });

  const sel = selected ? funderStats.find(f => f.id === selected) : null;
  const selTxs = selected ? transactions.filter(t => t.funderId === selected) : [];
  const selBudgets = selected ? budgets.filter(b => b.funderId === selected) : [];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Controle por financiador</div>
          <div className="page-sub">Posição financeira individualizada por fonte de recurso</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm"><Icon name="download" size={13} /> Exportar</button>
        </div>
      </div>
      <div className="content">
        {/* Summary table */}
        <div className="card mb16">
          <div className="card-header"><div className="card-title">Resumo por financiador</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Financiador</th><th>Tipo</th><th className="text-right">Orç. aprovado</th>
                  <th className="text-right">Total recebido</th><th className="text-right">Total executado</th>
                  <th className="text-right">Saldo</th><th>% Execução</th><th>Movim.</th><th>Status</th><th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {funderStats.map(f => (
                  <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => setSelected(selected === f.id ? null : f.id)}>
                    <td><div className="fw600">{f.id}</div><div style={{ fontSize: 11, color: "#6B7280" }}>{f.name}</div></td>
                    <td><span className="badge badge-gray">{f.type}</span></td>
                    <td className="text-right">{fmt(f.budget)}</td>
                    <td className="text-right color-green fw600">{fmt(f.received)}</td>
                    <td className="text-right color-red fw600">{fmt(f.executed)}</td>
                    <td className={`text-right fw600 ${f.balance >= 0 ? "color-green" : "color-red"}`}>{fmt(f.balance)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${Math.min(f.pct * 100, 100)}%`, background: f.pct > 0.9 ? "#EF4444" : f.pct > 0.7 ? "#F59E0B" : "#4F8EF7" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, minWidth: 36 }}>{pct(f.pct)}</span>
                      </div>
                    </td>
                    <td className="text-center">{f.txCount}</td>
                    <td>
                      {f.pct > 0.9 ? <span className="badge badge-red">⚠ &gt;90%</span>
                        : f.pct > 0.7 ? <span className="badge badge-yellow">Atenção</span>
                        : <span className="badge badge-green">Normal</span>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-xs">{selected === f.id ? "▲" : "▼"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {sel && (
          <div className="card mb16">
            <div className="card-header">
              <div>
                <div className="card-title">{sel.id} — {sel.name}</div>
                <div className="card-sub">{sel.type} · {sel.txCount} movimentações registradas</div>
              </div>
            </div>
            <div style={{ padding: "16px" }}>
              <div className="tabs">
                <div className="tab active">Movimentações</div>
                <div className="tab">Orçamento</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Data</th><th>Projeto</th><th>Categoria</th><th>Descrição</th><th className="text-right">Valor</th><th>Tipo</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {selTxs.slice(0, 8).map(t => (
                      <tr key={t.id}>
                        <td className="color-gray">{t.date}</td>
                        <td><span className="chip badge-purple">{t.projectId}</span></td>
                        <td>{t.category}</td>
                        <td>{t.description}</td>
                        <td className={`text-right fw600 ${t.type === "Entrada" ? "color-green" : "color-red"}`}>{fmt(t.realized)}</td>
                        <td><span className={`badge ${t.type === "Entrada" ? "badge-green" : "badge-red"}`}>{t.type}</span></td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── BUDGET PAGE ──────────────────────────────────────────────────────────────
function BudgetPage({ transactions, budgets, setBudgets, projects }) {
  const [editingBudget, setEditingBudget] = useState(null);
  const [filterProject, setFilterProject] = useState("");

  const budgetRows = budgets
    .filter(b => !filterProject || b.projectId === filterProject)
    .map(b => {
      const realized = transactions.filter(t => t.projectId === b.projectId && t.category === b.category && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
      const balance = b.revised - realized;
      const pctExec = b.revised > 0 ? realized / b.revised : 0;
      return { ...b, realized, balance, pctExec };
    });

  const totalApproved = budgetRows.reduce((s, b) => s + b.approved, 0);
  const totalRevised = budgetRows.reduce((s, b) => s + b.revised, 0);
  const totalRealized = budgetRows.reduce((s, b) => s + b.realized, 0);

  const handleSaveBudget = (id, revised) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, revised: parseFloat(revised) || b.revised } : b));
    showToast("Orçamento revisado salvo!");
    setEditingBudget(null);
  };

  // Group by project
  const byProject = {};
  budgetRows.forEach(b => {
    if (!byProject[b.projectId]) byProject[b.projectId] = [];
    byProject[b.projectId].push(b);
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Controle orçamentário</div>
          <div className="page-sub">Orçamento aprovado × revisado × realizado</div>
        </div>
        <div className="topbar-actions">
          <select className="form-control" style={{ fontSize: 12, padding: "6px 10px" }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">Todos os projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm"><Icon name="download" size={13} /> Exportar</button>
        </div>
      </div>
      <div className="content">
        {/* Summary */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="kpi-card">
            <div className="kpi-label">Orçamento aprovado</div>
            <div className="kpi-value">{fmt(totalApproved)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Orçamento revisado</div>
            <div className="kpi-value">{fmt(totalRevised)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total realizado</div>
            <div className="kpi-value" style={{ color: "#DC2626" }}>{fmt(totalRealized)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Saldo disponível</div>
            <div className="kpi-value" style={{ color: "#16A34A" }}>{fmt(totalRevised - totalRealized)}</div>
            <div className="kpi-sub">% execução: {pct(totalRevised > 0 ? totalRealized / totalRevised : 0)}</div>
          </div>
        </div>

        {/* Budget table grouped by project */}
        {Object.entries(byProject).map(([projId, rows]) => {
          const proj = projects.find(p => p.id === projId);
          return (
            <div key={projId} className="card mb16">
              <div className="card-header" style={{ background: "#F9FAFB" }}>
                <div>
                  <div className="card-title">{projId} — {proj?.name}</div>
                  <div className="card-sub">Financiador: {proj?.funderId}</div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th className="text-right">Orç. Aprovado</th>
                      <th className="text-right">Orç. Revisado</th>
                      <th className="text-right">Realizado</th>
                      <th className="text-right">Saldo</th>
                      <th style={{ minWidth: 150 }}>% Execução</th>
                      <th>Alerta</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(b => (
                      <tr key={b.id}>
                        <td className="fw600">{b.category}</td>
                        <td className="text-right">{fmt(b.approved)}</td>
                        <td className="text-right">
                          {editingBudget === b.id ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <input id={`rev-${b.id}`} className="form-control" style={{ width: 90, padding: "4px 6px", fontSize: 11 }} defaultValue={b.revised} />
                              <button className="btn btn-primary btn-xs" onClick={() => handleSaveBudget(b.id, document.getElementById(`rev-${b.id}`).value)}>✓</button>
                            </div>
                          ) : fmt(b.revised)}
                        </td>
                        <td className="text-right color-red fw600">{fmt(b.realized)}</td>
                        <td className={`text-right fw600 ${b.balance >= 0 ? "color-green" : "color-red"}`}>{fmt(b.balance)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{ width: `${Math.min(b.pctExec * 100, 100)}%`, background: b.pctExec > 1 ? "#DC2626" : b.pctExec > 0.9 ? "#EF4444" : b.pctExec > 0.7 ? "#F59E0B" : "#10B981" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, minWidth: 36 }}>{pct(b.pctExec)}</span>
                          </div>
                        </td>
                        <td>
                          {b.pctExec > 1 ? <span className="badge badge-red">🚨 Estourou</span>
                            : b.pctExec > 0.9 ? <span className="badge badge-red">⚠ &gt;90%</span>
                            : b.pctExec > 0.7 ? <span className="badge badge-yellow">📊 &gt;70%</span>
                            : <span className="badge badge-green">✓ Normal</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditingBudget(editingBudget === b.id ? null : b.id)}>
                            <Icon name="edit" size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Subtotals */}
                    <tr style={{ background: "#F9FAFB", fontWeight: 600 }}>
                      <td>Total {projId}</td>
                      <td className="text-right">{fmt(rows.reduce((s,b)=>s+b.approved,0))}</td>
                      <td className="text-right">{fmt(rows.reduce((s,b)=>s+b.revised,0))}</td>
                      <td className="text-right color-red">{fmt(rows.reduce((s,b)=>s+b.realized,0))}</td>
                      <td className="text-right color-green">{fmt(rows.reduce((s,b)=>s+b.balance,0))}</td>
                      <td colSpan={3} className="text-center" style={{ fontSize: 12 }}>
                        {pct(rows.reduce((s,b)=>s+b.revised,0) > 0 ? rows.reduce((s,b)=>s+b.realized,0) / rows.reduce((s,b)=>s+b.revised,0) : 0)} executado
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── INVESTMENTS PAGE ─────────────────────────────────────────────────────────
function InvestmentsPage({ investments, setInvestments, funders }) {
  const [showForm, setShowForm] = useState(false);

  const totalYield = investments.reduce((s, i) => s + i.yieldAmount, 0);
  const totalBalance = investments.reduce((s, i) => s + (i.initialBalance || 0) + i.deposit + i.yieldAmount - i.withdrawal, 0);
  const totalDeposit = investments.reduce((s, i) => s + (i.initialBalance || 0) + i.deposit, 0);

  const byFunder = funders.map(f => {
    const rows = investments.filter(i => i.funderId === f.id);
    const balance = rows.reduce((s, i) => s + (i.initialBalance || 0) + i.deposit + i.yieldAmount - i.withdrawal, 0);
    const yields = rows.reduce((s, i) => s + i.yieldAmount, 0);
    return { ...f, balance, yields };
  }).filter(f => f.balance > 0 || f.yields > 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Rendimentos financeiros</div>
          <div className="page-sub">Aplicações e rendimentos por financiador</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={13} /> Registrar aplicação
          </button>
        </div>
      </div>
      <div className="content">
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kpi-card">
            <div className="kpi-label">Saldo total aplicado</div>
            <div className="kpi-value">{fmt(totalDeposit)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Rendimentos acumulados</div>
            <div className="kpi-value" style={{ color: "#16A34A" }}>{fmt(totalYield)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Saldo atual (líquido)</div>
            <div className="kpi-value">{fmt(totalBalance)}</div>
          </div>
        </div>

        {/* By funder summary */}
        <div className="dash-grid mb16">
          {byFunder.map(f => (
            <div key={f.id} className="kpi-card">
              <div className="kpi-label">{f.id} — {f.name}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(f.balance)}</div>
              <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>Rendimentos: {fmt(f.yields)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Registro de aplicações</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Data</th><th>Conta / Aplicação</th><th>Financiador</th>
                  <th className="text-right">Saldo inicial</th><th className="text-right">Aporte</th>
                  <th className="text-right">Taxa a.m.</th><th className="text-right">Rendimento</th>
                  <th className="text-right">Resgate</th><th className="text-right">Saldo atual</th><th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(inv => {
                  const saldoAtual = (inv.initialBalance || 0) + inv.deposit + inv.yieldAmount - inv.withdrawal;
                  return (
                    <tr key={inv.id}>
                      <td className="mono">{inv.id}</td>
                      <td className="color-gray">{inv.date}</td>
                      <td>{inv.account}</td>
                      <td><span className="chip badge-blue">{inv.funderId}</span></td>
                      <td className="text-right">{inv.initialBalance ? fmt(inv.initialBalance) : "–"}</td>
                      <td className="text-right">{inv.deposit ? fmt(inv.deposit) : "–"}</td>
                      <td className="text-right">{(inv.monthlyRate * 100).toFixed(3)}%</td>
                      <td className="text-right color-green fw600">{fmt(inv.yieldAmount)}</td>
                      <td className="text-right color-red">{inv.withdrawal ? fmt(inv.withdrawal) : "–"}</td>
                      <td className="text-right fw600">{fmt(saldoAtual)}</td>
                      <td className="color-gray" style={{ fontSize: 11 }}>{inv.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Registrar aplicação / rendimento</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><Icon name="close" size={14} /></button>
            </div>
            <InvestmentForm funders={funders} onSave={(data) => {
              setInvestments(prev => [...prev, { id: "INV-" + String(prev.length + 1).padStart(3, "0"), ...data }]);
              setShowForm(false);
              showToast("Aplicação registrada!");
            }} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function InvestmentForm({ onSave, onClose, funders }) {
  const [form, setForm] = useState({ date: today(), account: "", funderId: "", initialBalance: "", deposit: "0", monthlyRate: "", yieldAmount: "", withdrawal: "0", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      <div className="modal-body">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" className="form-control" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Financiador</label>
            <select className="form-control" value={form.funderId} onChange={e => set("funderId", e.target.value)}>
              <option value="">Selecione...</option>
              {funders.map(f => <option key={f.id} value={f.id}>{f.id} – {f.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Conta / Descrição da aplicação</label>
            <input className="form-control" placeholder="Ex: CB004 – BB LFT FIN001" value={form.account} onChange={e => set("account", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Saldo inicial (R$)</label>
            <input className="form-control" placeholder="0.00" value={form.initialBalance} onChange={e => set("initialBalance", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Aporte (R$)</label>
            <input className="form-control" placeholder="0.00" value={form.deposit} onChange={e => set("deposit", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Taxa a.m. (%)</label>
            <input className="form-control" placeholder="0.92" value={form.monthlyRate} onChange={e => set("monthlyRate", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Rendimento (R$)</label>
            <input className="form-control" placeholder="0.00" value={form.yieldAmount} onChange={e => set("yieldAmount", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Resgate (R$)</label>
            <input className="form-control" placeholder="0.00" value={form.withdrawal} onChange={e => set("withdrawal", e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Observações</label>
            <input className="form-control" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave({ ...form, initialBalance: parseFloat(form.initialBalance)||0, deposit: parseFloat(form.deposit)||0, monthlyRate: parseFloat(form.monthlyRate)/100||0, yieldAmount: parseFloat(form.yieldAmount)||0, withdrawal: parseFloat(form.withdrawal)||0 })}>Salvar</button>
      </div>
    </>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
function ReportsPage({ transactions, investments, budgets, funders, categories, projects }) {
  const [selFunder, setSelFunder] = useState(funders[0]?.id || "");
  const [selProject, setSelProject] = useState("");
  const [periodStart, setPeriodStart] = useState("01/2024");
  const [periodEnd, setPeriodEnd] = useState("12/2024");

  const fTxs = transactions.filter(t => {
    if (t.funderId !== selFunder) return false;
    if (selProject && t.projectId !== selProject) return false;
    return true;
  });

  const totalRec = fTxs.filter(t => t.type === "Entrada").reduce((s, t) => s + t.realized, 0);
  const totalExec = fTxs.filter(t => t.type === "Saída").reduce((s, t) => s + t.realized, 0);
  const totalYield = investments.filter(i => i.funderId === selFunder).reduce((s, i) => s + i.yieldAmount, 0);
  const saldo = totalRec - totalExec + totalYield;

  const byCategory = categories.map(cat => {
    const orc = budgets.filter(b => b.funderId === selFunder && (!selProject || b.projectId === selProject) && b.category === cat).reduce((s, b) => s + b.revised, 0);
    const real = fTxs.filter(t => t.category === cat && t.type === "Saída").reduce((s, t) => s + t.realized, 0);
    return { cat, orc, real, balance: orc - real, pct: orc > 0 ? real / orc : 0 };
  }).filter(c => c.orc > 0 || c.real > 0);

  const funder = funders.find(f => f.id === selFunder);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Relatórios e prestação de contas</div>
          <div className="page-sub">Geração de relatórios por financiador e período</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm"><Icon name="download" size={13} /> Exportar Excel</button>
          <button className="btn btn-primary btn-sm"><Icon name="reports" size={13} /> Gerar PDF</button>
        </div>
      </div>
      <div className="content">
        {/* Filter panel */}
        <div className="card mb16">
          <div className="card-header"><div className="card-title">Parâmetros do relatório</div></div>
          <div style={{ padding: "16px" }}>
            <div className="form-grid form-grid-2" style={{ maxWidth: 560 }}>
              <div className="form-group">
                <label className="form-label">Financiador</label>
                <select className="form-control" value={selFunder} onChange={e => setSelFunder(e.target.value)}>
                  {funders.map(f => <option key={f.id} value={f.id}>{f.id} – {f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Projeto (opcional)</label>
                <select className="form-control" value={selProject} onChange={e => setSelProject(e.target.value)}>
                  <option value="">Todos os projetos</option>
                  {projects.filter(p => p.funderId === selFunder).map(p => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Período início (mm/aaaa)</label>
                <input className="form-control" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Período fim (mm/aaaa)</label>
                <input className="form-control" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Report preview */}
        <div style={{ border: "2px solid #E5E7EB", borderRadius: 12, background: "#fff", padding: "24px" }}>
          {/* Report header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #1A1D23", paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1D23", marginBottom: 4 }}>RELATÓRIO DE PRESTAÇÃO DE CONTAS</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>Financiador: {funder?.name} ({selFunder}) · Período: {periodStart} a {periodEnd}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Gerado em: {new Date().toLocaleDateString("pt-BR")} · Sistema FinGest</div>
          </div>

          {/* Executive summary */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1A1D23", borderLeft: "3px solid #4F8EF7", paddingLeft: 10 }}>RESUMO EXECUTIVO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Total recebido", value: fmt(totalRec), color: "#16A34A" },
                { label: "Total executado", value: fmt(totalExec), color: "#DC2626" },
                { label: "Rendimentos", value: fmt(totalYield), color: "#16A34A" },
                { label: "Saldo disponível", value: fmt(saldo), color: saldo >= 0 ? "#16A34A" : "#DC2626" },
              ].map(item => (
                <div key={item.label} style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px", border: "1px solid #E5E7EB" }}>
                  <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* By category */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1A1D23", borderLeft: "3px solid #4F8EF7", paddingLeft: 10 }}>DESPESAS POR CATEGORIA</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#1A1D23", color: "#fff" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Categoria</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Orç. revisado</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Realizado</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Saldo</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>% Execução</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c, i) => (
                  <tr key={c.cat} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{c.cat}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(c.orc)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#DC2626" }}>{fmt(c.real)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: c.balance >= 0 ? "#16A34A" : "#DC2626" }}>{fmt(c.balance)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: c.pct > 0.9 ? "#DC2626" : c.pct > 0.7 ? "#CA8A04" : "#16A34A" }}>{pct(c.pct)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#1A1D23", color: "#fff" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700 }}>TOTAL</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(byCategory.reduce((s,c)=>s+c.orc,0))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(totalExec)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(byCategory.reduce((s,c)=>s+c.balance,0))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>
                    {pct(byCategory.reduce((s,c)=>s+c.orc,0) > 0 ? totalExec / byCategory.reduce((s,c)=>s+c.orc,0) : 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transaction list */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1A1D23", borderLeft: "3px solid #4F8EF7", paddingLeft: 10 }}>RELAÇÃO DE DESPESAS</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#F3F4F6" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Data</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Categoria</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Descrição</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Documento</th>
                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Valor</th>
                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fTxs.filter(t => t.type === "Saída").map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "5px 10px", color: "#6B7280" }}>{t.date}</td>
                    <td style={{ padding: "5px 10px" }}>{t.category}</td>
                    <td style={{ padding: "5px 10px" }}>{t.description}</td>
                    <td style={{ padding: "5px 10px", fontFamily: "monospace", color: "#6B7280" }}>{t.document}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(t.realized)}</td>
                    <td style={{ padding: "5px 10px", textAlign: "center" }}>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── AUDIT PAGE ───────────────────────────────────────────────────────────────
function AuditPage({ logs, users }) {
  const [search, setSearch] = useState("");
  const [filterOp, setFilterOp] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const filtered = logs.filter(l => {
    if (filterOp && l.operation !== filterOp) return false;
    if (filterUser && l.userId !== filterUser) return false;
    if (search && !l.description.toLowerCase().includes(search.toLowerCase()) && !l.record.includes(search)) return false;
    return true;
  });

  const opColors = { INSERT: "badge-green", UPDATE: "badge-yellow", DELETE: "badge-red", LOGIN: "badge-gray", UPDATE_STATUS: "badge-blue" };
  const borderColors = { INSERT: "#16A34A", UPDATE: "#CA8A04", DELETE: "#DC2626", LOGIN: "#6B7280", UPDATE_STATUS: "#2563EB" };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Histórico de auditoria</div>
          <div className="page-sub">Rastreabilidade completa de todas as operações</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm"><Icon name="download" size={13} /> Exportar log</button>
        </div>
      </div>
      <div className="content">
        <div className="filter-bar">
          <input placeholder="🔍 Buscar operação, registro..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
          <select value={filterOp} onChange={e => setFilterOp(e.target.value)}>
            <option value="">Todas as operações</option>
            <option>INSERT</option><option>UPDATE</option><option>DELETE</option><option>LOGIN</option>
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">Todos os usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div className="empty-state card" style={{ padding: "40px" }}>
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">Nenhum registro encontrado</div>
            </div>
          )}
          {filtered.map(log => (
            <div key={log.id} className="card" style={{ borderLeft: `3px solid ${borderColors[log.operation] || "#6B7280"}`, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`badge ${opColors[log.operation] || "badge-gray"}`}>{log.operation}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{log.table}</span>
                  <span className="badge badge-gray">{log.record}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{log.date}</div>
              </div>
              <div style={{ fontSize: 12, color: "#374151" }}>{log.description}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                Por: <span style={{ fontWeight: 500, color: "#6B7280" }}>{log.userName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ users, setUsers, currentUserId }) {
  const [showForm, setShowForm] = useState(false);
  const roleColors = { Administrador: "badge-red", Usuario: "badge-blue" };

  const toggleActive = async (u) => {
    const { error } = await supabase.from("profiles").update({ active: !u.active }).eq("id", u.id);
    if (error) {
      showToast("Erro ao atualizar usuário: " + error.message, "error");
      return;
    }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !x.active } : x));
    showToast(u.active ? "Usuário desativado" : "Usuário ativado");
  };

  const toggleRole = async (u) => {
    const newRole = u.role === "Administrador" ? "Usuario" : "Administrador";
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", u.id);
    if (error) {
      showToast("Erro ao atualizar perfil: " + error.message, "error");
      return;
    }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    showToast("Perfil atualizado para " + newRole);
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Gestão de usuários</div>
          <div className="page-sub">{users.filter(u=>u.active).length} usuários ativos · {users.length} total</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={13} /> Convidar usuário
          </button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{u.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                        <span className="fw600">{u.name}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${roleColors[u.role] || "badge-gray"}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.active ? "badge-green" : "badge-gray"}`}>
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex" style={{ gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => toggleRole(u)} disabled={u.id === currentUserId}>
                          {u.role === "Administrador" ? "Tornar Usuário" : "Tornar Admin"}
                        </button>
                        <button className="btn btn-ghost btn-xs" style={{ color: u.active ? "#DC2626" : "#16A34A" }}
                          onClick={() => toggleActive(u)} disabled={u.id === currentUserId}>
                          {u.active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Convidar novo usuário</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><Icon name="close" size={14} /></button>
            </div>
            <InviteUserForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function InviteUserForm({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Usuario" });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleInvite = async () => {
    if (!form.name || !form.email) { showToast("Preencha nome e e-mail", "error"); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao convidar usuário");
      showToast(`Convite enviado para ${form.email}!`);
      onClose();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="modal-body">
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-control" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" className="form-control" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Perfil de acesso</label>
            <select className="form-control" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="Usuario">Usuário</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
        </div>
        <div className="alert alert-info" style={{ marginTop: 12 }}>
          <Icon name="eye" size={13} />
          <div><strong>Permissões do perfil {form.role}:</strong> {
            form.role === "Administrador"
              ? "Acesso total ao sistema, incluindo a gestão de usuários."
              : "Acesso completo aos módulos financeiros (lançamentos, projetos, financiadores, orçamento, relatórios), sem acesso à gestão de usuários."
          }</div>
        </div>
        <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>
          A pessoa convidada receberá um e-mail com um link para definir sua própria senha e acessar o sistema.
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleInvite} disabled={sending}>
          <Icon name="check" size={13} /> {sending ? "Enviando..." : "Enviar convite"}
        </button>
      </div>
    </>
  );
}

// ─── PARAMS PAGE ──────────────────────────────────────────────────────────────
function ParamsPage({ funders, setFunders, projects, setProjects, costCenters, setCostCenters, categories, subcategoriesMap, bankAccounts, setBankAccounts }) {
  const [activeTab, setActiveTab] = useState("financiadores");

  const tabs = [
    { id: "financiadores", label: "Financiadores" },
    { id: "projetos", label: "Projetos" },
    { id: "centros", label: "Centros de custo" },
    { id: "categorias", label: "Categorias" },
    { id: "contas", label: "Contas bancárias" },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Parâmetros gerais</div>
          <div className="page-sub">Configuração de tabelas de referência do sistema</div>
        </div>
      </div>
      <div className="content">
        <div className="alert alert-info mb16">
          <Icon name="eye" size={13} />
          <span>Alterações nos parâmetros afetam todos os módulos do sistema. Remover um registro ativo pode causar inconsistências.</span>
        </div>

        <div className="card">
          <div style={{ padding: "0 16px" }}>
            <div className="tabs">
              {tabs.map(t => (
                <div key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {activeTab === "financiadores" && (
            <div>
              <div className="card-header">
                <div className="card-title">Financiadores cadastrados</div>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const name = prompt("Nome do financiador:");
                  if (name) { setFunders(prev => [...prev, { id: "FIN" + String(prev.length + 1).padStart(3, "0"), name, type: "Outro", active: true, budget: 0 }]); showToast("Financiador adicionado!"); }
                }}><Icon name="plus" size={13} /> Adicionar</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Orç. aprovado</th><th>Status</th><th>Ação</th></tr></thead>
                  <tbody>
                    {funders.map(f => (
                      <tr key={f.id}>
                        <td className="mono fw600">{f.id}</td>
                        <td>{f.name}</td>
                        <td><span className="badge badge-gray">{f.type}</span></td>
                        <td className="text-right">{fmt(f.budget)}</td>
                        <td><span className={`badge ${f.active ? "badge-green" : "badge-gray"}`}>{f.active ? "Ativo" : "Inativo"}</span></td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={() => { setFunders(prev => prev.map(x => x.id === f.id ? { ...x, active: !x.active } : x)); showToast("Status atualizado"); }}>
                            {f.active ? "Desativar" : "Ativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "projetos" && (
            <div>
              <div className="card-header">
                <div className="card-title">Projetos cadastrados</div>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const name = prompt("Nome do projeto:");
                  if (!name) return;
                  const funderId = prompt("Código do financiador vinculado (ex: FIN001):");
                  if (!funderId) return;
                  setProjects(prev => [...prev, {
                      id: "PRJ" + String(prev.length + 1).padStart(3, "0"),
                      name,
                      funderId,
                      start: new Date().toISOString().split("T")[0],
                      end: "",
                      status: "Ativo"
                    }]);
                  showToast("Projeto adicionado!");
                  }}><Icon name="plus" size={13} /> Adicionar projeto</button>
              </div>  
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Financiador</th><th>Início</th><th>Término</th><th>Status</th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id}>
                        <td className="mono fw600">{p.id}</td>
                        <td>{p.name}</td>
                        <td><span className="chip badge-blue">{p.funderId}</span></td>
                        <td className="color-gray">{p.start}</td>
                        <td className="color-gray">{p.end}</td>
                        <td><span className={`badge ${p.status === "Ativo" ? "badge-green" : "badge-gray"}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "centros" && (
            <div>
              <div className="card-header">
                <div className="card-title">Centros de custo</div>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const name = prompt("Nome do centro de custo:");
                  if (!name) return;
                  setCostCenters(prev => [...prev, { id: "CC" + String(prev.length + 1).padStart(3, "0"), name }]);
                  showToast("Centro de custo adicionado!");
                }}><Icon name="plus" size={13} /> Adicionar</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th></tr></thead>
                  <tbody>{costCenters.map(c => (<tr key={c.id}><td className="mono">{c.id}</td><td>{c.name}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "categorias" && (
            <div>
              <div className="card-header"><div className="card-title">Categorias e subcategorias</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Categoria</th><th>Subcategorias</th></tr></thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat}>
                        <td className="fw600">{cat}</td>
                        <td>{subcategoriesMap[cat]?.join(" · ") || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "contas" && (
            <div>
              <div className="card-header">
                <div className="card-title">Contas bancárias</div>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const name = prompt("Nome do banco / conta:");
                  if (!name) return;
                  const funderId = prompt("Código do financiador vinculado (ex: FIN001):");
                  if (!funderId) return;
                  setBankAccounts(prev => [...prev, { id: "BC" + String(prev.length + 1).padStart(3, "0"), name, funderId }]);
                  showToast("Conta bancária adicionada!");
                }}><Icon name="plus" size={13} /> Adicionar</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Banco / Conta</th><th>Financiador vinculado</th></tr></thead>
                  <tbody>{bankAccounts.map(a => (<tr key={a.id}><td className="mono">{a.id}</td><td>{a.name}</td><td><span className="chip badge-blue">{a.funderId}</span></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

