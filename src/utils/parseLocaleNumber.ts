export function parseLocaleNumber(stringNumber: string, locale: string): number {
  // Si el string está vacío o es undefined, retornar 0
  if (!stringNumber) return 0;

  // Limpiar el string de caracteres no numéricos excepto , y .
  const cleanedString = stringNumber.replace(/[^\d,.-]/g, '');
  
  // Si después de limpiar no queda nada, retornar 0
  if (!cleanedString) return 0;

  // Para el locale es-CR, sabemos que usa . como separador de miles y , como separador decimal
  // Primero eliminamos los puntos y luego reemplazamos la coma por punto
  const standardizedNumber = cleanedString
    .replace(/\./g, '')     // Eliminar todos los puntos (separadores de miles)
    .replace(',', '.');     // Reemplazar la coma decimal por punto

  // Convertir a número
  const number = parseFloat(standardizedNumber);
  
  // Verificar si es un número válido
  return isNaN(number) ? 0 : number;
}
