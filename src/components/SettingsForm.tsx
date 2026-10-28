'use client';
import { DECK_OVERRIDABLE, estimateDailyReviews, type Settings } from '@/lib/settings';
import { CARD_TYPE_LABEL, CARD_TYPES, type CardType } from '@/lib/types';

type Props = {
  value: Settings;
  onChange: (patch: Partial<Settings>) => void;
  scope: 'global' | 'deck';
};

export default function SettingsForm({ value: v, onChange, scope }: Props) {
  const show = (k: keyof Settings) => scope === 'global' || DECK_OVERRIDABLE.includes(k);
  const typesOn = CARD_TYPES.filter((t) => v.cardTypes[t]).length;

  return (
    <div className="space-y-6">
      <Group title="Ritmo diário">
        {show('newPerDay') && <Num label="Cards novos por dia" k="newPerDay" v={v} onChange={onChange} min={0} max={100} />}
        {show('maxReviewsPerDay') && <Num label="Máximo de revisões por dia" k="maxReviewsPerDay" v={v} onChange={onChange} min={10} max={1000} step={10} />}
        {show('newOrder') && <Select label="Ordem dos novos" k="newOrder" v={v} onChange={onChange} options={{ sequential: 'Ordem do deck', random: 'Aleatória' }} />}
        {show('mixMode') && <Select label="Novos e revisões" k="mixMode" v={v} onChange={onChange} options={{ mixed: 'Misturados', newFirst: 'Novos primeiro', reviewsFirst: 'Revisões primeiro' }} />}
      </Group>

      <Group title="Frequência dos cards">
        {show('retention') && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="label">Retenção desejada</span>
              <span className="font-display font-bold text-accent">{Math.round(v.retention * 100)}%</span>
            </div>
            <input type="range" min={0.7} max={0.97} step={0.01} value={v.retention} onChange={(e) => onChange({ retention: +e.target.value })} className="w-full accent-[var(--accent)]" />
            <p className="hint">
              Chance de lembrar o card quando ele aparecer. Mais alto = o card aparece mais vezes. Estimativa: ~{estimateDailyReviews(v.newPerDay, v.retention, typesOn)} revisões/dia.
            </p>
          </div>
        )}
        {show('learningSteps') && <Text label="Passos de aprendizado" hint="Intervalos para cards novos. Ex.: 1m 10m 1d" k="learningSteps" v={v} onChange={onChange} />}
        {show('relearningSteps') && <Text label="Passos de reaprendizado" hint="Depois de errar um card já aprendido. Ex.: 10m" k="relearningSteps" v={v} onChange={onChange} />}
        {show('maxInterval') && <Num label="Intervalo máximo (dias)" k="maxInterval" v={v} onChange={onChange} min={1} max={3650} />}
        {show('easyBonus') && <Num label="Bônus do Fácil" hint="1,3 = neutro. Maior = Fácil empurra mais para frente." k="easyBonus" v={v} onChange={onChange} min={1} max={3} step={0.05} />}
        {show('hardFactor') && <Num label="Multiplicador do Difícil" hint="1,0 = neutro. Menor = Difícil volta mais cedo." k="hardFactor" v={v} onChange={onChange} min={0.3} max={1.5} step={0.05} />}
        {scope === 'global' && <Num label="Prioridade alta multiplica intervalo por" k="priorityHigh" v={v} onChange={onChange} min={0.2} max={1} step={0.05} />}
        {scope === 'global' && <Num label="Prioridade baixa multiplica intervalo por" k="priorityLow" v={v} onChange={onChange} min={1} max={4} step={0.1} />}
        {scope === 'global' && <Toggle label="Variação aleatória (fuzz)" hint="Espalha os cards para não chegarem todos no mesmo dia." k="fuzz" v={v} onChange={onChange} />}
      </Group>

      {show('cardTypes') && (
        <Group title="Tipos de card">
          {CARD_TYPES.map((t: CardType) => (
            <label key={t} className="flex items-center justify-between py-1">
              <span className="label">{CARD_TYPE_LABEL[t]}</span>
              <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={v.cardTypes[t]} onChange={(e) => onChange({ cardTypes: { ...v.cardTypes, [t]: e.target.checked } })} />
            </label>
          ))}
          {scope === 'global' && <Toggle label="Digitar a resposta" hint="Em Produção e Escuta, digite antes de ver a resposta." k="typeAnswer" v={v} onChange={onChange} />}
        </Group>
      )}

      <Group title="Cards difíceis">
        {show('leechThreshold') && <Num label="Erros até virar card difícil" k="leechThreshold" v={v} onChange={onChange} min={2} max={20} />}
        {scope === 'global' && <Select label="Quando virar difícil" k="leechAction" v={v} onChange={onChange} options={{ warn: 'Avisar e sugerir dica', suspend: 'Suspender automaticamente' }} />}
        {scope === 'global' && <Toggle label="Esconder cards irmãos" hint="Não mostra outro tipo de card da mesma palavra no mesmo dia." k="burySiblings" v={v} onChange={onChange} />}
      </Group>

      <Group title="Exibição e áudio">
        {show('autoplay') && <Select label="Tocar áudio automaticamente" k="autoplay" v={v} onChange={onChange} options={{ front: 'Na frente do card', back: 'Só na resposta', never: 'Nunca' }} />}
        {scope === 'global' && <Num label="Velocidade do áudio" k="audioRate" v={v} onChange={onChange} min={0.5} max={1.5} step={0.05} />}
        {show('crutch') && <Select label="Pronúncia literal na frente" k="crutch" v={v} onChange={onChange} options={{ auto: 'Automático (some com o tempo)', always: 'Sempre mostrar', tap: 'Esconder (tocar para ver)', never: 'Só na resposta' }} />}
        {scope === 'global' && v.crutch === 'auto' && <Num label="Esconder após N revisões" k="crutchAfter" v={v} onChange={onChange} min={1} max={20} />}
        {scope === 'global' && <Select label="Japonês: escrita" k="jaScript" v={v} onChange={onChange} options={{ 'kana+romaji': 'Kana + romaji', kana: 'Só kana', romaji: 'Só romaji' }} />}
      </Group>

      {scope === 'global' && (
        <>
          <Group title="Sessão">
            <Select label="Tipo de sessão" k="sessionMode" v={v} onChange={onChange} options={{ count: 'Por quantidade', time: 'Por tempo' }} />
            {v.sessionMode === 'count' ? <Num label="Cards por sessão" k="sessionSize" v={v} onChange={onChange} min={5} max={200} step={5} /> : <Num label="Minutos por sessão" k="sessionMinutes" v={v} onChange={onChange} min={3} max={60} />}
            <Num label="Meta diária (minutos)" k="dailyGoalMinutes" v={v} onChange={onChange} min={5} max={120} step={5} />
          </Group>
          <Group title="Avaliação de pronúncia">
            <Toggle label="Sugerir nota pela pronúncia" k="autoGradePronunciation" v={v} onChange={onChange} />
            <Num label="Nota mínima para “Bom”" k="pronunciationGood" v={v} onChange={onChange} min={40} max={100} step={5} />
            <Num label="Nota mínima para “Fácil”" k="pronunciationEasy" v={v} onChange={onChange} min={50} max={100} step={1} />
          </Group>
        </>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

type FieldProps<K extends keyof Settings> = { label: string; hint?: string; k: K; v: Settings; onChange: (p: Partial<Settings>) => void };

function Num({ label, hint, k, v, onChange, min, max, step = 1 }: FieldProps<keyof Settings> & { min: number; max: number; step?: number }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{label}</span>
        <input type="number" className="field w-24 py-1.5 text-right" min={min} max={max} step={step} value={v[k] as number} onChange={(e) => e.target.value !== '' && onChange({ [k]: Math.min(max, Math.max(min, +e.target.value)) })} />
      </div>
      {hint && <p className="hint">{hint}</p>}
    </label>
  );
}

function Text({ label, hint, k, v, onChange }: FieldProps<keyof Settings>) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      <input className="field" value={v[k] as string} onChange={(e) => onChange({ [k]: e.target.value })} />
      {hint && <p className="hint">{hint}</p>}
    </label>
  );
}

function Select({ label, k, v, onChange, options }: FieldProps<keyof Settings> & { options: Record<string, string> }) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      <select className="field" value={v[k] as string} onChange={(e) => onChange({ [k]: e.target.value })}>
        {Object.entries(options).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, hint, k, v, onChange }: FieldProps<keyof Settings>) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span>
        <span className="label block">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={v[k] as boolean} onChange={(e) => onChange({ [k]: e.target.checked })} />
    </label>
  );
}
