import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Función para formatear montos en Colones
const formatCRC = (amount: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [budget, setBudget] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [error, setError] = useState<string | null>(null);

  // Calcular dimensiones de los gráficos basado en el ancho de la ventana
  const getChartDimensions = () => {
    if (windowWidth < 640) {
      return { height: 300, pieOuterRadius: 80 };
    } else if (windowWidth < 1024) {
      return { height: 350, pieOuterRadius: 100 };
    }
    return { height: 400, pieOuterRadius: 120 };
  };

  const { height, pieOuterRadius } = getChartDimensions();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    loadDashboardData();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Cargar presupuesto
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (budgetError) throw budgetError;
      setBudget(budgetData);

      // Cargar transacciones de los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', threeMonthsAgo.toISOString())
        .order('date', { ascending: true });

      if (transactionsError) throw transactionsError;

      // Procesar datos para el gráfico mensual
      const monthlyStats = processMonthlyData(transactions || []);
      setMonthlyData(monthlyStats);

      // Procesar datos para el gráfico de categorías
      const categoryStats = processCategoryData(transactions || []);
      setCategoryData(categoryStats);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (transactions: any[]) => {
    const months: { [key: string]: { ingresos: number, gastos: number } } = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleString('es-CR', { month: 'short' });
      
      if (!months[monthKey]) {
        months[monthKey] = { ingresos: 0, gastos: 0 };
      }

      if (transaction.type === 'income') {
        months[monthKey].ingresos += Number(transaction.amount);
      } else {
        months[monthKey].gastos += Number(transaction.amount);
      }
    });

    return Object.entries(months).map(([name, data]) => ({
      name,
      ...data
    }));
  };

  const processCategoryData = (transactions: any[]) => {
    const categories: { [key: string]: number } = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        const amount = Number(transaction.amount);
        categories[transaction.category] = (categories[transaction.category] || 0) + amount;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCRC(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  const currentMonthData = monthlyData[monthlyData.length - 1] || { ingresos: 0, gastos: 0 };
  const previousMonthData = monthlyData[monthlyData.length - 2] || { ingresos: 0, gastos: 0 };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculatePercentageChange(currentMonthData.ingresos, previousMonthData.ingresos);
  const expenseChange = calculatePercentageChange(currentMonthData.gastos, previousMonthData.gastos);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700">Balance Mensual</h3>
            <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-2">
            {formatCRC(currentMonthData.ingresos)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {monthlyData.length > 1 
              ? `${incomeChange.toFixed(1)}% vs. mes anterior`
              : 'No hay datos del mes anterior'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700">Gastos Totales</h3>
            <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-2">
            {formatCRC(currentMonthData.gastos)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {monthlyData.length > 1
              ? `${expenseChange.toFixed(1)}% vs. mes anterior`
              : 'No hay datos del mes anterior'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700">Proyección Ahorro</h3>
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold mt-2">
            {formatCRC(monthlyData.reduce((acc, month) => acc + (month.ingresos - month.gastos), 0))}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Meta anual: {formatCRC(budget?.yearlySavingsGoal || 0)}
          </p>
        </div>
      </div>

      {monthlyData.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600">No hay datos disponibles. Comienza agregando transacciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolución Mensual */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Evolución Mensual</h3>
            <div style={{ height, width: '100%' }} className="mt-4">
              <ResponsiveContainer>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: windowWidth < 640 ? 12 : 14 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₡${value / 1000}k`}
                    tick={{ fontSize: windowWidth < 640 ? 12 : 14 }}
                    width={windowWidth < 640 ? 50 : 60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ 
                      fontSize: windowWidth < 640 ? '12px' : '14px',
                      paddingTop: '10px'
                    }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#4F46E5" />
                  <Bar dataKey="gastos" name="Gastos" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribución de Gastos */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Distribución de Gastos</h3>
            <div style={{ height, width: '100%' }} className="mt-4">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={pieOuterRadius}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout={windowWidth < 640 ? 'horizontal' : 'vertical'}
                    align={windowWidth < 640 ? 'center' : 'right'}
                    verticalAlign={windowWidth < 640 ? 'bottom' : 'middle'}
                    wrapperStyle={{
                      fontSize: windowWidth < 640 ? '12px' : '14px',
                      paddingTop: windowWidth < 640 ? '10px' : '0'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
