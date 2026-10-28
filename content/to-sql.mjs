// Gera o SQL de seed: node content/to-sql.mjs > content/seed.sql
import { decks } from './seed.mjs';

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

let sql = 'begin;\n';
for (const d of decks) {
  sql += `with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values (${q(d.language)},${q(d.title)},${q(d.theme)},${q(d.level)},${q(d.description)},${!!d.survival},${d.sort}) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values\n`;
  sql += d.items
    .map(([o, r, t, p, tip, ex, exPt, kind], i) =>
      `((select id from d),${q(kind ?? 'word')},${q(o)},${q(r)},${q(t)},${q(p)},${q(tip)},${q(ex)},${q(exPt)},${i})`)
    .join(',\n');
  sql += ';\n';
}
sql += 'commit;\n';
process.stdout.write(sql);
