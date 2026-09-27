import { describe, expect, it } from 'vitest';
import { decodeSheet, encodeSheet } from '../src/share/share';

describe('options de la feuille partagée', () => {
  const refs = [{ code: 'D01', seed: 5 }];

  it('« Recommencer » désactivé et une seule vérification passent dans le lien', () => {
    const url = encodeSheet({ refs, title: '', showSolutions: false, inputs: true, allowRetry: false, singleAttempt: true });
    expect(url).toContain('r=0');
    expect(url).toContain('u=1');
    const d = decodeSheet(new URLSearchParams(url.split('?')[1]))!;
    expect(d.allowRetry).toBe(false);
    expect(d.singleAttempt).toBe(true);
    expect(d.showSolutions).toBe(false);
  });

  it('par défaut : recommencer autorisé, vérifications illimitées, lien inchangé', () => {
    const url = encodeSheet({ refs, title: '', showSolutions: true, inputs: true });
    expect(url).not.toMatch(/[?&](r|u)=/);
    const d = decodeSheet(new URLSearchParams(url.split('?')[1]))!;
    expect(d.allowRetry).toBe(true);
    expect(d.singleAttempt).toBe(false);
  });

  it('les anciens liens (sans ces options) gardent le comportement par défaut', () => {
    const d = decodeSheet(new URLSearchParams('v=1&e=D01.5&c=1&s=1'))!;
    expect(d.allowRetry).toBe(true);
    expect(d.singleAttempt).toBe(false);
  });
});
