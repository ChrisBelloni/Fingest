import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

// ─── Mapeamento de campos: banco (snake_case) <-> app (camelCase) ──────────
const mapFunderFromDb = (r) => ({ id: r.id, name: r.name, type: r.type, active: r.active, budget: Number(r.budget) || 0 });
const mapFunderToDb = (f) => ({ id: f.id, name: f.name, type: f.type, active: f.active, budget: f.budget });

const mapProjectFromDb = (r) => ({ id: r.id, name: r.name, funderId: r.funder_id, status: r.status, start: r.start_date, end: r.end_date });
const mapProjectToDb = (p) => ({ id: p.id, name: p.name, funder_id: p.funderId, status: p.status, start_date: p.start || null, end_date: p.end || null });

const mapCostCenterFromDb = (r) => ({ id: r.id, name: r.name });
const mapCostCenterToDb = (c) => ({ id: c.id, name: c.name });

const mapBankAccountFromDb = (r) => ({ id: r.id, name: r.name, funderId: r.funder_id });
const mapBankAccountToDb = (b) => ({ id: b.id, name: b.name, funder_id: b.funderId });

const mapUserFromDb = (r) => ({ id: r.id, name: r.name, role: r.role, active: r.active });

const mapTxFromDb = (r) => ({
  id: r.id, date: r.date, competence: r.competence, funderId: r.funder_id, projectId: r.project_id,
  costCenterId: r.cost_center_id, bankAccountId: r.bank_account_id, source: r.source, type: r.type,
  category: r.category, subcategory: r.subcategory, description: r.description, document: r.document,
  planned: Number(r.planned) || 0, realized: Number(r.realized) || 0, status: r.status, userId: r.user_id, notes: r.notes,
});
const mapTxToDb = (t) => ({
  id: t.id, date: t.date, competence: t.competence, funder_id: t.funderId, project_id: t.projectId,
  cost_center_id: t.costCenterId, bank_account_id: t.bankAccountId, source: t.source, type: t.type,
  category: t.category, subcategory: t.subcategory, description: t.description, document: t.document,
  planned: t.planned, realized: t.realized, status: t.status, user_id: t.userId, notes: t.notes,
});

const mapBudgetFromDb = (r) => ({ id: r.id, projectId: r.project_id, funderId: r.funder_id, category: r.category, approved: Number(r.approved) || 0, revised: Number(r.revised) || 0 });
const mapBudgetToDb = (b) => ({ id: b.id, project_id: b.projectId, funder_id: b.funderId, category: b.category, approved: b.approved, revised: b.revised });

const mapInvestmentFromDb = (r) => ({
  id: r.id, date: r.date, account: r.account, funderId: r.funder_id,
  initialBalance: Number(r.initial_balance) || 0, deposit: Number(r.deposit) || 0,
  monthlyRate: Number(r.monthly_rate) || 0, yieldAmount: Number(r.yield_amount) || 0,
  withdrawal: Number(r.withdrawal) || 0, notes: r.notes,
});
const mapInvestmentToDb = (i) => ({
  id: i.id, date: i.date, account: i.account, funder_id: i.funderId,
  initial_balance: i.initialBalance, deposit: i.deposit, monthly_rate: i.monthlyRate,
  yield_amount: i.yieldAmount, withdrawal: i.withdrawal, notes: i.notes,
});

const mapAuditFromDb = (r) => ({ id: r.id, date: r.date, userId: r.user_id, userName: r.user_name, table: r.table_name, operation: r.operation, record: r.record, description: r.description });
const mapAuditToDb = (a) => ({ id: a.id, date: a.date, user_id: a.userId, user_name: a.userName, table_name: a.table, operation: a.operation, record: a.record, description: a.description });

const mapSubcategoryFromDb = (r) => ({ category: r.category, name: r.name });

/**
 * Hook central: carrega todas as tabelas do Supabase e expoe arrays + setters
 * que sincronizam de volta ao banco, mantendo a mesma interface que os
 * componentes do FinGest ja esperam (useState-like).
 */
export function useSupabaseData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [funders, setFundersState] = useState([]);
  const [projects, setProjectsState] = useState([]);
  const [categories, setCategoriesState] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [costCenters, setCostCentersState] = useState([]);
  const [bankAccounts, setBankAccountsState] = useState([]);
  const [users, setUsersState] = useState([]);
  const [transactions, setTransactionsState] = useState([]);
  const [budgets, setBudgetsState] = useState([]);
  const [investments, setInvestmentsState] = useState([]);
  const [auditLogs, setAuditLogsState] = useState([]);

  const loadedOnce = useRef(false);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    (async () => {
      try {
        const [
          fundersRes, projectsRes, categoriesRes, subcategoriesRes,
          costCentersRes, bankAccountsRes, usersRes,
          transactionsRes, budgetsRes, investmentsRes, auditRes,
        ] = await Promise.all([
          supabase.from("funders").select("*").order("id"),
          supabase.from("projects").select("*").order("id"),
          supabase.from("categories").select("*").order("name"),
          supabase.from("subcategories").select("*").order("id"),
          supabase.from("cost_centers").select("*").order("id"),
          supabase.from("bank_accounts").select("*").order("id"),
          supabase.from("profiles").select("*").order("created_at"),
          supabase.from("transactions").select("*").order("date", { ascending: false }),
          supabase.from("budgets").select("*").order("id"),
          supabase.from("investments").select("*").order("date", { ascending: false }),
          supabase.from("audit_logs").select("*").order("created_at", { ascending: false }),
        ]);

        const firstError = [fundersRes, projectsRes, categoriesRes, subcategoriesRes,
          costCentersRes, bankAccountsRes, usersRes, transactionsRes, budgetsRes,
          investmentsRes, auditRes].find(r => r.error);
        if (firstError) throw firstError.error;

        setFundersState((fundersRes.data || []).map(mapFunderFromDb));
        setProjectsState((projectsRes.data || []).map(mapProjectFromDb));
        setCategoriesState((categoriesRes.data || []).map(r => r.name));

        const subMap = {};
        (subcategoriesRes.data || []).map(mapSubcategoryFromDb).forEach(s => {
          if (!subMap[s.category]) subMap[s.category] = [];
          subMap[s.category].push(s.name);
        });
        setSubcategoriesMap(subMap);

        setCostCentersState((costCentersRes.data || []).map(mapCostCenterFromDb));
        setBankAccountsState((bankAccountsRes.data || []).map(mapBankAccountFromDb));
        setUsersState((usersRes.data || []).map(mapUserFromDb));
        setTransactionsState((transactionsRes.data || []).map(mapTxFromDb));
        setBudgetsState((budgetsRes.data || []).map(mapBudgetFromDb));
        setInvestmentsState((investmentsRes.data || []).map(mapInvestmentFromDb));
        setAuditLogsState((auditRes.data || []).map(mapAuditFromDb));
      } catch (e) {
        console.error("Erro ao carregar dados do Supabase:", e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Funders ──────────────────────────────────────────────────────────────
  const setFunders = useCallback((updater) => {
    setFundersState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(f => f.id));
      const nextIds = new Set(next.map(f => f.id));
      const added = next.filter(f => !prevIds.has(f.id));
      const removed = prev.filter(f => !nextIds.has(f.id));
      const updated = next.filter(f => {
        const old = prev.find(p => p.id === f.id);
        return old && JSON.stringify(old) !== JSON.stringify(f);
      });
      added.forEach(f => supabase.from("funders").insert(mapFunderToDb(f)).then());
      updated.forEach(f => supabase.from("funders").update(mapFunderToDb(f)).eq("id", f.id).then());
      removed.forEach(f => supabase.from("funders").delete().eq("id", f.id).then());
      return next;
    });
  }, []);

  // ── Projects ─────────────────────────────────────────────────────────────
  const setProjects = useCallback((updater) => {
    setProjectsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(p => p.id));
      const nextIds = new Set(next.map(p => p.id));
      next.filter(p => !prevIds.has(p.id)).forEach(p => supabase.from("projects").insert(mapProjectToDb(p)).then());
      next.filter(p => {
        const old = prev.find(o => o.id === p.id);
        return old && JSON.stringify(old) !== JSON.stringify(p);
      }).forEach(p => supabase.from("projects").update(mapProjectToDb(p)).eq("id", p.id).then());
      prev.filter(p => !nextIds.has(p.id)).forEach(p => supabase.from("projects").delete().eq("id", p.id).then());
      return next;
    });
  }, []);

  // ── Cost Centers ─────────────────────────────────────────────────────────
  const setCostCenters = useCallback((updater) => {
    setCostCentersState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(c => c.id));
      next.filter(c => !prevIds.has(c.id)).forEach(c => supabase.from("cost_centers").insert(mapCostCenterToDb(c)).then());
      return next;
    });
  }, []);

  // ── Bank Accounts ────────────────────────────────────────────────────────
  const setBankAccounts = useCallback((updater) => {
    setBankAccountsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(b => b.id));
      next.filter(b => !prevIds.has(b.id)).forEach(b => supabase.from("bank_accounts").insert(mapBankAccountToDb(b)).then());
      return next;
    });
  }, []);

  // ── Users (profiles) ─────────────────────────────────────────────────────
  // A escrita real (convite, ativar/desativar, trocar perfil) é feita
  // diretamente nos componentes via supabase.from("profiles"), pois exige
  // checagens de permissão (RLS) e, no caso de convite, uma Edge Function.
  // Aqui apenas refletimos o estado local após essas operações terem sucesso.
  const setUsers = useCallback((updater) => {
    setUsersState(prev => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  // ── Transactions ─────────────────────────────────────────────────────────
  const setTransactions = useCallback((updater) => {
    setTransactionsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(t => t.id));
      const nextIds = new Set(next.map(t => t.id));
      next.filter(t => !prevIds.has(t.id)).forEach(t => supabase.from("transactions").insert(mapTxToDb(t)).then());
      next.filter(t => {
        const old = prev.find(o => o.id === t.id);
        return old && JSON.stringify(old) !== JSON.stringify(t);
      }).forEach(t => supabase.from("transactions").update(mapTxToDb(t)).eq("id", t.id).then());
      prev.filter(t => !nextIds.has(t.id)).forEach(t => supabase.from("transactions").delete().eq("id", t.id).then());
      return next;
    });
  }, []);

  // ── Budgets ──────────────────────────────────────────────────────────────
  const setBudgets = useCallback((updater) => {
    setBudgetsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(b => b.id));
      next.filter(b => !prevIds.has(b.id)).forEach(b => supabase.from("budgets").insert(mapBudgetToDb(b)).then());
      next.filter(b => {
        const old = prev.find(o => o.id === b.id);
        return old && JSON.stringify(old) !== JSON.stringify(b);
      }).forEach(b => supabase.from("budgets").update(mapBudgetToDb(b)).eq("id", b.id).then());
      return next;
    });
  }, []);

  // ── Investments ──────────────────────────────────────────────────────────
  const setInvestments = useCallback((updater) => {
    setInvestmentsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(i => i.id));
      next.filter(i => !prevIds.has(i.id)).forEach(i => supabase.from("investments").insert(mapInvestmentToDb(i)).then());
      return next;
    });
  }, []);

  // ── Audit Logs ───────────────────────────────────────────────────────────
  const setAuditLogs = useCallback((updater) => {
    setAuditLogsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevIds = new Set(prev.map(a => a.id));
      next.filter(a => !prevIds.has(a.id)).forEach(a => supabase.from("audit_logs").insert(mapAuditToDb(a)).then());
      return next;
    });
  }, []);

  return {
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
  };
}
