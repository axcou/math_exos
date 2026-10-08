import type { Template } from '../types';
import { S02, S03, S04, S05 } from './adequation';
import { S08 } from './anova';
import { S06, S07 } from './contingency';
import { S01 } from './proportions';

/** Tests statistiques (chapitre « stat », page « Tests stat. »). */
export const STAT_TEMPLATES: Template[] = [S01, S02, S03, S04, S05, S06, S07, S08];
