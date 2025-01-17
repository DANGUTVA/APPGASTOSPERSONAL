import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Alert {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  date: string;
}

// Función para formatear montos en Colones
const formatCRC = (amount: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const Notifications = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBudgetAlerts();
  }, []);

  const checkBudgetAlerts = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      // Get budget and transactions
      const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (!budget) {
        setAlerts([{
          id: 'no-budget',
          message: 'No has configurado tu presupuesto. Por favor, configura tu presupuesto para recibir alertas.',
          type: 'info',
          date: new Date().toISOString()
        }]);
        setLoading(false);
        return;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('type', 'expense')
        .gte('date', startOfMonth.toISOString());

      const newAlerts: Alert[] = [];
      
      if (transactions) {
        const totalExpenses = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

        // Check spending limit
        if (budget.spendingLimit > 0) {
          const spendingPercentage = (totalExpenses / budget.spendingLimit) * 100;
          
          if (spendingPercentage >= 90) {
            newAlerts.push({
              id: 'spending-critical',
              message: `¡Alerta crítica! Has alcanzado el ${Math.round(spendingPercentage)}% de tu límite de gastos mensual (${formatCRC(totalExpenses)} de ${formatCRC(budget.spendingLimit)})`,
              type: 'warning',
              date: new Date().toISOString()
            });
          } else if (spendingPercentage >= 80) {
            newAlerts.push({
              id: 'spending-warning',
              message: `¡Precaución! Has alcanzado el ${Math.round(spendingPercentage)}% de tu límite de gastos mensual (${formatCRC(totalExpenses)} de ${formatCRC(budget.spendingLimit)})`,
              type: 'warning',
              date: new Date().toISOString()
            });
          }
        }

        // Check savings goal
        if (budget.monthlyIncome > 0 && budget.monthlySavingsGoal > 0) {
          const currentSavings = budget.monthlyIncome - totalExpenses;
          const savingsGoalProgress = (currentSavings / budget.monthlySavingsGoal) * 100;

          if (savingsGoalProgress < 50 && new Date().getDate() > 15) {
            newAlerts.push({
              id: 'savings-goal',
              message: `Estás lejos de tu meta de ahorro mensual. Ahorro actual: ${formatCRC(currentSavings)}, Meta: ${formatCRC(budget.monthlySavingsGoal)}`,
              type: 'warning',
              date: new Date().toISOString()
            });
          }
        }

        // Check category limits
        if (budget.categories) {
          for (const [category, limit] of Object.entries(budget.categories)) {
            if (!limit) continue;
            
            const categoryExpenses = transactions
              .filter(t => t.category === category)
              .reduce((sum, t) => sum + Number(t.amount), 0);

            const categoryPercentage = (categoryExpenses / Number(limit)) * 100;
            
            if (categoryPercentage >= 90) {
              newAlerts.push({
                id: `category-${category}`,
                message: `Has superado el ${Math.round(categoryPercentage)}% del límite en la categoría ${category} (${formatCRC(categoryExpenses)} de ${formatCRC(Number(limit))})`,
                type: 'warning',
                date: new Date().toISOString()
              });
            }
          }
        }
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error checking alerts:', error);
      setAlerts([{
        id: 'error',
        message: 'Error al cargar las alertas. Por favor, intenta de nuevo más tarde.',
        type: 'warning',
        date: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2">Cargando alertas...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-800">Notificaciones y Alertas</h2>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-md">
              <CheckCircle className="h-5 w-5" />
              <p>¡Todo en orden! No hay alertas pendientes.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-4 rounded-md ${
                  alert.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-700'
                    : alert.type === 'info'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {alert.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                ) : alert.type === 'info' ? (
                  <Bell className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm opacity-75">
                    {new Date(alert.date).toLocaleDateString('es-CR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
