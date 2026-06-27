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

  // 👇 MOVIDOS PARA CIMA — antes dos returns condicionais de loading/error
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

  // ✅ Agora os returns condicionais vêm depois de TODOS os hooks
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
          {page === "params" && <ParamsPage funders={funders} setFunders={setFunders} projects={projects} setProjects={setProjects} costCenters={costCenters} categories={categories} subcategoriesMap={subcategoriesMap} bankAccounts={bankAccounts} />}
        </div>
      </div>
      <ToastManager />
    </>
  );
}
