/*
 * Écriture des nombres décimaux : à la française dans les énoncés
 * (virgule, « 16{,}67 » en LaTeX), avec un point dans le code R.
 */

function fixed(x: number, decimals: number): string {
  const s = x.toFixed(decimals);
  // pas de « -0,00 »
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
}

/** Nombre arrondi, sans zéros inutiles (« 0,5 », « 12 »), en LaTeX. */
export function texNum(x: number, decimals = 2): string {
  let s = fixed(x, decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', '{,}');
}

/** Nombre arrondi avec exactement `decimals` décimales, en LaTeX (« 0{,}050 »). */
export function texFixed(x: number, decimals: number): string {
  return fixed(x, decimals).replace('.', '{,}');
}

/** Même chose en texte simple (« 0,050 »). */
export function textFixed(x: number, decimals: number): string {
  return fixed(x, decimals).replace('.', ',');
}

/** p-valeur lisible : « 0{,}047 », ou « < 0{,}001 » quand elle est minuscule. */
export function texPValue(p: number): string {
  return p < 0.001 ? '< 0{,}001' : texFixed(p, 3);
}

/** Nombre pour le code R (point décimal, au plus 6 décimales). */
export function rNum(x: number): string {
  return String(Number(x.toFixed(6)));
}

/** Pourcentage en LaTeX (« 5\,\% »). */
export const texPercent = (alpha: number): string => `${texNum(alpha * 100, 1)}\\,\\%`;
