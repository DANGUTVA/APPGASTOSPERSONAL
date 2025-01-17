// Función para formatear números al estilo costarricense (1.000.000,00)
export const formatCRC = (amount: number | string): string => {
  // Si es string, convertir a número
  const numAmount = typeof amount === 'string' ? 
    parseFloat(amount.replace(/\./g, '').replace(',', '.')) : 
    amount;

  // Si no es un número válido, retornar 0,00
  if (isNaN(numAmount)) return '0,00';

  return new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(numAmount);
};

// Función para convertir string formateado a número
export const parseCRC = (value: string): number => {
  if (!value) return 0;
  
  // Limpiar el string de caracteres no numéricos excepto , y .
  const cleanValue = value.trim().replace(/[^\d,.-]/g, '');
  
  // Si después de limpiar no queda nada, retornar 0
  if (!cleanValue) return 0;

  // Eliminar los puntos y reemplazar la coma por punto
  const standardizedNumber = cleanValue
    .replace(/\./g, '')     // Eliminar separadores de miles
    .replace(',', '.');     // Convertir separador decimal

  // Convertir a número
  const number = parseFloat(standardizedNumber);
  
  // Verificar si es un número válido
  return isNaN(number) ? 0 : number;
};

// Función para validar el formato del número
export const isValidCRCFormat = (value: string): boolean => {
  // Si el valor está vacío o es solo un separador, permitirlo
  if (!value || value === ',' || value === '.' || value === '') return true;

  // Verificar el formato general (1.234.567,89)
  const regex = /^[0-9]{1,3}(\.?[0-9]{3})*(\,[0-9]{0,2})?$/;
  return regex.test(value);
};

// Función para formatear el input mientras el usuario escribe
export const formatInputNumber = (value: string): string => {
  // Si el valor está vacío, retornar vacío
  if (!value) return '';

  // Eliminar todo excepto números, puntos y comas
  let cleaned = value.replace(/[^\d.,]/g, '');
  
  // Reemplazar múltiples puntos/comas con uno solo
  cleaned = cleaned.replace(/\.+/g, '.').replace(/,+/g, ',');
  
  // Asegurar que solo hay una coma decimal
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts[1];
  }

  // Manejar la parte decimal
  let [intPart, decPart] = cleaned.split(',');
  
  // Limpiar puntos existentes en la parte entera
  intPart = intPart.replace(/\./g, '');
  
  // Formatear los miles
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Reconstruir el número con la parte decimal si existe
  if (decPart !== undefined) {
    return `${intPart},${decPart.slice(0, 2)}`;
  }
  
  return intPart;
};
