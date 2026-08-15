export const parseValorMonetario = (valor: string): number => {
  if (!valor) return NaN;
  let normalizado = valor.trim();
  if (normalizado.includes(',')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(normalizado);
};
