import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, Calendar, Tag, FileText } from 'lucide-react';
import { formatInputNumber, isValidCRCFormat } from '../utils/numberFormat';

const TransactionForm = () => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    type: 'expense',
    payment_method: 'cash'
  });
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<{[key: string]: string}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInputErrors({});

    // Validar el formato del monto
    if (!isValidCRCFormat(formData.amount)) {
      setInputErrors({ amount: 'Formato inválido. Use el formato 1.000.000,00' });
      return;
    }

    // Convertir el monto a un número
    const amountNumber = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('transactions')
        .insert([{
          ...formData,
          amount: amountNumber,
          user_id: user.id,
          date: new Date(formData.date).toISOString()
        }]);
      
      if (error) throw error;
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        description: '',
        type: 'expense',
        payment_method: 'cash'
      });
      
      alert('Transacción guardada exitosamente');
    } catch (error: any) {
      console.error('Error:', error);
      setError('Error al guardar la transacción. Por favor, intenta de nuevo.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'amount') {
      const formattedValue = formatInputNumber(value);
      setFormData({ ...formData, [field]: formattedValue });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Transacción</h2>
      
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
                <Calendar className="h-5 w-5" />
                Fecha
              </div>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Monto (₡)
              </div>
            </label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                inputErrors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0,00"
              required
            />
            {inputErrors.amount && (
              <p className="mt-1 text-sm text-red-600">{inputErrors.amount}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Categoría
            </div>
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Seleccionar categoría</option>
            <option value="fijos">Gastos Fijos</option>
            <option value="variables">Gastos Variables</option>
            <option value="ocio">Ocio</option>
            <option value="ahorro">Ahorro</option>
            <option value="otros">Otros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Descripción
            </div>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            placeholder="Añade una descripción..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="expense"
                  checked={formData.type === 'expense'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="form-radio text-indigo-600"
                />
                <span className="ml-2">Gasto</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="form-radio text-indigo-600"
                />
                <span className="ml-2">Ingreso</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
            <select
              value={formData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="cash">Efectivo</option>
              <option value="credit">Tarjeta de Crédito</option>
              <option value="debit">Tarjeta de Débito</option>
              <option value="transfer">Transferencia</option>
              <option value="sinpe">SINPE Móvil</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Guardar Transacción
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
