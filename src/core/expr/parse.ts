import type { Expr, FnName } from './ast';
import { fromDecimal } from './rational';

/*
 * Parseur des réponses tapées par l'élève : « (2x+1)/(x-3) », « 3x²-2 »,
 * « e^(2x) », « ln x », « √(x+1) », multiplication implicite…
 * Produit un arbre brut (non simplifié) pour que l'aperçu reflète la saisie.
 */

export class ParseError extends Error {}

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: 'x' | 'e' | 'pi' | FnName }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | '(' | ')' };

const WORDS: [string, Token][] = [
  ['racine', { t: 'id', v: 'sqrt' }],
  ['sqrt', { t: 'id', v: 'sqrt' }],
  ['exp', { t: 'id', v: 'exp' }],
  ['ln', { t: 'id', v: 'ln' }],
  ['pi', { t: 'id', v: 'pi' }],
  ['x', { t: 'id', v: 'x' }],
  ['e', { t: 'id', v: 'e' }],
];

function normalize(s: string): string {
  return s
    .replace(/[−–]/g, '-')
    .replace(/[×·•]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/,/g, '.')
    .replace(/\*\*/g, '^')
    .replace(/[[{]/g, '(')
    .replace(/[\]}]/g, ')')
    .toLowerCase();
}

function tokenize(src: string): Token[] {
  const s = normalize(src);
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^[0-9]*\.?[0-9]*/.exec(s.slice(i))![0];
      if (m === '.' || (m.match(/\./g)?.length ?? 0) > 1) throw new ParseError(`Nombre mal écrit : « ${m} »`);
      out.push({ t: 'num', v: parseFloat(m) });
      i += m.length;
    } else if ('+-*/^()'.includes(ch)) {
      out.push({ t: 'op', v: ch as '+' });
      i++;
    } else if (/[a-z]/.test(ch)) {
      const w = WORDS.find(([word]) => s.startsWith(word, i));
      if (!w) {
        const m = /^[a-z]+/.exec(s.slice(i))![0];
        throw new ParseError(`Symbole inconnu : « ${m} » (utilise x, e, ln, exp, sqrt)`);
      }
      out.push(w[1]);
      i += w[0].length;
    } else {
      throw new ParseError(`Caractère non reconnu : « ${ch} »`);
    }
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(private toks: Token[]) {}

  private peek(): Token | undefined {
    return this.toks[this.i];
  }

  private isOp(v: string): boolean {
    const t = this.peek();
    return t?.t === 'op' && t.v === v;
  }

  private startsPrimary(): boolean {
    const t = this.peek();
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  }

  parseAll(): Expr {
    if (this.toks.length === 0) throw new ParseError('Réponse vide');
    const e = this.expr();
    if (this.i < this.toks.length) {
      const t = this.peek()!;
      throw new ParseError(t.t === 'op' && t.v === ')' ? 'Parenthèse fermante en trop' : 'Expression mal formée');
    }
    return e;
  }

  private expr(): Expr {
    const terms: Expr[] = [this.term()];
    while (this.isOp('+') || this.isOp('-')) {
      const minus = this.isOp('-');
      this.i++;
      const t = this.term();
      terms.push(minus ? { type: 'neg', arg: t } : t);
    }
    return terms.length === 1 ? terms[0] : { type: 'add', terms };
  }

  private term(): Expr {
    let left = this.unary();
    for (;;) {
      if (this.isOp('*')) {
        this.i++;
        left = mulRaw(left, this.unary());
      } else if (this.isOp('/')) {
        this.i++;
        left = { type: 'div', num: left, den: this.unary() };
      } else if (this.startsPrimary()) {
        left = mulRaw(left, this.power());
      } else return left;
    }
  }

  private unary(): Expr {
    if (this.isOp('-')) {
      this.i++;
      return { type: 'neg', arg: this.unary() };
    }
    if (this.isOp('+')) {
      this.i++;
      return this.unary();
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.primary();
    if (this.isOp('^')) {
      this.i++;
      if (!this.peek()) throw new ParseError('Exposant manquant après « ^ »');
      const exp = this.unary();
      if (base.type === 'const' && base.name === 'e') return { type: 'fn', name: 'exp', arg: exp };
      return { type: 'pow', base, exp };
    }
    return base;
  }

  private primary(): Expr {
    const t = this.peek();
    if (!t) throw new ParseError('Expression incomplète');
    this.i++;
    if (t.t === 'num') return { type: 'num', value: fromDecimal(t.v) };
    if (t.t === 'id') {
      if (t.v === 'x') return { type: 'var' };
      if (t.v === 'e' || t.v === 'pi') return { type: 'const', name: t.v };
      if (!this.peek()) throw new ParseError(`Argument manquant après « ${t.v} »`);
      const arg = this.isOp('(') ? this.primary() : this.power();
      return { type: 'fn', name: t.v, arg };
    }
    if (t.v === '(') {
      const e = this.expr();
      if (!this.isOp(')')) throw new ParseError('Parenthèse non fermée');
      this.i++;
      return e;
    }
    throw new ParseError(t.v === ')' ? 'Parenthèse fermante inattendue' : `Opérateur « ${t.v} » mal placé`);
  }
}

function mulRaw(a: Expr, b: Expr): Expr {
  const fa = a.type === 'mul' ? a.factors : [a];
  return { type: 'mul', factors: [...fa, b] };
}

export function parse(src: string): Expr {
  return new Parser(tokenize(src)).parseAll();
}
