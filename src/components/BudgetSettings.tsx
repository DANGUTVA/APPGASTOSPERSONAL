import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Target, DollarSign, PiggyBank } from 'lucide-react';
import { formatCRC, parseCRC, formatInputNumber, isValidCRCFormat } from '../utils/numberFormat';

const defaultBudget = {
  monthlyIncome: '0,00',
  monthlySavingsGoal: '0,00',
  yearlySavingsGoal: '0,00',
  spendingLimit: '0,00',
  categories: {
    fijos: '0,00',
    variables: '0,00',
    ocio: '0,00',
    ahorro: '0,00',
    otros: '0,00'
  }
};

const BudgetSettings = () => {
  const [budget, setBudget] = useState(defaultBudget);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No se ha iniciado sesión');
      }

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setBudget({
          monthlyIncome: formatCRC(data.monthlyIncome || 0),
          monthlySavingsGoal: formatCRC(data.monthlySavingsGoal || 0),
          yearlySavingsGoal: formatCRC(data.yearlySavingsGoal || 0),
          spendingLimit: formatCRC(data.spendingLimit || 0),
          categories: {
            fijos: formatCRC(data.categories?.fijos || 0),
            variables: formatCRC(data.categories?.variables || 0),
            ocio: formatCRC(data.categories?.ocio || 0),
            ahorro: formatCRC(data.categories?.ahorro || 0),
            otros: formatCRC(data.categories?.otros || 0)
          }
        });
      }
    } catch (error: any) {
      console.error('Error loading budget:', error);
      setError('Error al cargar el presupuesto. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '0,00') {
      if (e.target.name.startsWith('categories.')) {
        const category = e.target.name.split('.')[1];
        setBudget(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            [category]: ''
          }
        }));
      } else {
        setBudget(prev => ({
          ...prev,
          [e.target.name]: ''
        }));
      }
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value === '' || !isValidCRCFormat(value)) {
      if (e.target.name.startsWith('categories.')) {
        const category = e.target.name.split('.')[1];
        setBudget(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            [category]: '0,00'
          }
        }));
      } else {
        setBudget(prev => ({
          ...prev,
          [e.target.name]: '0,00'
        }));
      }
    }
  };

  const handleInputChange = (field: string, value: string, isCategory = false) => {
    const formattedValue = formatInputNumber(value);
    
    if (value && !isValidCRCFormat(formattedValue)) {
      setInputErrors({
        ...inputErrors,
        [field]: 'Formato inválido. Use el formato 1.000.000,00'
      });
      return;
    }

    setInputErrors({
      ...inputErrors,
      [field]: ''
    });

    if (isCategory) {
      setBudget({
        ...budget,
        categories: {
          ...budget.categories,
          [field]: formattedValue
        }
      });
    } else {
      setBudget({
        ...budget,
        [field]: formattedValue
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Por favor inicie sesión para guardar el presupuesto');
        return;
      }

      // Convertir los valores formateados a números
      const budgetToSave = {
        monthlyIncome: parseCRC(budget.monthlyIncome),
        monthlySavingsGoal: parseCRC(budget.monthlySavingsGoal),
        yearlySavingsGoal: parseCRC(budget.yearlySavingsGoal),
        spendingLimit: parseCRC(budget.spendingLimit),
        categories: {
          fijos: parseCRC(budget.categories.fijos),
          variables: parseCRC(budget.categories.variables),
          ocio: parseCRC(budget.categories.ocio),
          ahorro: parseCRC(budget.categories.ahorro),
          otros: parseCRC(budget.categories.otros)
        }
      };

      // Verificar si ya existe un presupuesto para este usuario
      const { data: existingBudget } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existingBudget) {
        // Actualizar el presupuesto existente
        ({ error } = await supabase
          .from('budgets')
          .update(budgetToSave)
          .eq('id', existingBudget.id));
      } else {
        // Insertar nuevo presupuesto
        ({ error } = await supabase
          .from('budgets')
          .insert([{ ...budgetToSave, user_id: user.id }]));
      }

      if (error) throw error;
      
      await loadBudget(); // Recargar los datos actualizados
      setError(null);
      alert('Presupuesto actualizado exitosamente');
    } catch (error: any) {
      console.error('Error:', error);
      setError('Error al actualizar el presupuesto. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2">Cargando presupuesto...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Presupuesto</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ingreso Mensual (₡)
              </div>
            </label>
            <input
              type="text"
              name="monthlyIncome"
              value={budget.monthlyIncome}
              onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                inputErrors.monthlyIncome ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {inputErrors.monthlyIncome && (
              <p className="mt-1 text-sm text-red-600">{inputErrors.monthlyIncome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meta de Ahorro Mensual (₡)
              </div>
            </label>
            <input
              type="text"
              name="monthlySavingsGoal"
              value={budget.monthlySavingsGoal}
              onChange={(e) => handleInputChange('monthlySavingsGoal', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                inputErrors.monthlySavingsGoal ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {inputErrors.monthlySavingsGoal && (
              <p className="mt-1 text-sm text-red-600">{inputErrors.monthlySavingsGoal}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Meta de Ahorro Anual (₡)
              </div>
            </label>
            <input
              type="text"
              name="yearlySavingsGoal"
              value={budget.yearlySavingsGoal}
              onChange={(e) => handleInputChange('yearlySavingsGoal', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                inputErrors.yearlySavingsGoal ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {inputErrors.yearlySavingsGoal && (
              <p className="mt-1 text-sm text-red-600">{inputErrors.yearlySavingsGoal}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Límite de Gastos (₡)
              </div>
            </label>
            <input
              type="text"
              name="spendingLimit"
              value={budget.spendingLimit}
              onChange={(e) => handleInputChange('spendingLimit', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                inputErrors.spendingLimit ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {inputErrors.spendingLimit && (
              <p className="mt-1 text-sm text-red-600">{inputErrors.spendingLimit}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Límites por Categoría (₡)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(budget.categories).map(([category, value]) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {category}
                </label>
                <input
                  type="text"
                  name={`categories.${category}`}
                  value={value}
                  onChange={(e) => handleInputChange(category, e.target.value, true)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    inputErrors[category] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {inputErrors[category] && (
                  <p className="mt-1 text-sm text-red-600">{inputErrors[category]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              <span>Guardando...</span>
            </div>
          ) : (
            'Guardar Configuración'
          )}
        </button>
      </form>
    </div>
  );
};

export default BudgetSettings;
