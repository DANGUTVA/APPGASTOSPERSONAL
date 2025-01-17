import React, { useState, useEffect } from 'react';
import { PlusCircle, PieChart, Wallet, Target, Bell, Download, FileSpreadsheet, FileText, LogOut, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import BudgetSettings from './components/BudgetSettings';
import Notifications from './components/Notifications';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Por favor inicie sesión para exportar datos');
        return;
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!transactions || transactions.length === 0) {
        alert('No hay transacciones para exportar');
        return;
      }

      const formattedData = transactions.map(t => ({
        Fecha: new Date(t.date).toLocaleDateString('es-CR'),
        Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        Monto: t.amount,
        Categoría: t.category,
        Descripción: t.description,
        'Método de Pago': t.payment_method
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
      XLSX.writeFile(wb, 'transacciones_financieras.xlsx');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Por favor inicie sesión para exportar datos');
        return;
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!transactions || transactions.length === 0) {
        alert('No hay transacciones para exportar');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('Reporte Financiero', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-CR')}`, 20, 30);

      if (budget) {
        doc.setFontSize(16);
        doc.text('Resumen de Presupuesto', 20, 45);
        doc.setFontSize(12);
        doc.text(`Ingreso Mensual: ₡${budget.monthlyIncome}`, 20, 55);
        doc.text(`Meta de Ahorro Mensual: ₡${budget.monthlySavingsGoal}`, 20, 65);
      }

      doc.setFontSize(16);
      doc.text('Transacciones Recientes', 20, 85);
      
      let y = 95;
      transactions.slice(0, 10).forEach((t) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.text(
          `${new Date(t.date).toLocaleDateString('es-CR')} - ${t.type === 'income' ? 'Ingreso' : 'Gasto'} - ₡${t.amount} - ${t.category}`,
          20,
          y
        );
        y += 10;
      });

      doc.save('reporte_financiero.pdf');
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'transaction', label: 'Nueva Transacción', icon: PlusCircle },
    { id: 'budget', label: 'Presupuesto', icon: Target },
    { id: 'notifications', label: 'Alertas', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white py-4 px-4 sm:px-6 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="hidden sm:inline">Control Financiero Personal</span>
              <span className="sm:hidden">Control Financiero</span>
            </h1>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
                    activeTab === item.id
                      ? 'bg-indigo-700 text-white'
                      : 'hover:bg-indigo-500'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-indigo-500 ml-4 border-l border-indigo-500 pl-4"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </div>

          {/* Mobile navigation */}
          <div
            className={`lg:hidden transition-all duration-300 ease-in-out ${
              showMobileMenu ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
          >
            <nav className="mt-4 flex flex-col gap-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-md transition-colors ${
                    activeTab === item.id
                      ? 'bg-indigo-700 text-white'
                      : 'hover:bg-indigo-500'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-3 rounded-md hover:bg-indigo-500 mt-2 border-t border-indigo-500"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto py-6 sm:py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transaction' && <TransactionForm />}
        {activeTab === 'budget' && <BudgetSettings />}
        {activeTab === 'notifications' && <Notifications />}
      </main>

      {/* Export button */}
      <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className={`export-menu ${showExportMenu ? 'show' : ''}`}>
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Exportar Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              <FileText className="h-5 w-5" />
              Exportar PDF
            </button>
          </div>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className={`download-button bg-indigo-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
              showExportMenu ? 'rotated' : ''
            }`}
          >
            <Download className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
