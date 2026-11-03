'use client';
import { useEffect, useState } from 'react';
import type { Grade } from 'ts-fsrs';
import type { Entry } from '@/lib/queue';
import type { Settings } from '@/lib/settings';
import { similarity, speak } from '@/lib/speech';
import { Rating } from '@/lib/srs';
import { CARD_TYPE_LABEL } from '@/lib/types';
import { AudioBar, PlayButton } from './Audio';
import PronunciationCheck from './PronunciationCheck';
import Respelling from './Respelling';

type Props = {
  entry: Entry;
  s: Settings;
  revealed: boolean;
  onReveal: () => void;
  onSuggest: (r: Grade, why: string) => void;
};

export default function Flashcard({ entry, s, revealed, onReveal, onSuggest }: Props) {
  const { item, type, uc, deck } = entry;
  const lang = deck.language;
  const [typed, setTyped] = useState('');
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    setTyped('');
    setPeek(false);
    const autoFront = s.autoplay === 'front' && ['recognition', 'listening', 'pronunciation', 'cloze'].includes(type);
    if (s.audioOn && autoFront) speak(type === 'cloze' ? item.example ?? item.text_original : item.text_original, lang, s.audioRate);
  }, [item.id, type, lang, s.audioOn, s.autoplay, s.audioRate, item.example, item.text_original]);

  useEffect(() => {
    if (s.audioOn && revealed && (s.autoplay === 'back' || (s.autoplay === 'front' && (type === 'production' || type === 'reading'))))
      speak(item.text_original, lang, s.audioRate);
  }, [revealed, s.audioOn, s.autoplay, s.audioRate, type, item.text_original, lang]);

  // Muleta: quando mostrar a pronúncia literal na frente do card.
  const reps = uc?.reps ?? 0;
  const crutch = s.crutch === 'auto' ? (reps < s.crutchAfter ? 'always' : 'tap') : s.crutch;
  const showFrontRespelling = crutch === 'always' || (crutch === 'tap' && peek);

  const showKana = lang !== 'ja' || s.jaScript !== 'romaji';
  const showRomaji = (lang === 'ru' || (lang === 'ja' && s.jaScript !== 'kana')) && item.text_romanized;

  const original = (
    <div className="space-y-1 text-center">
      {showKana && <div className={`font-jp font-bold ${item.text_original.length > 14 ? 'text-3xl' : 'text-5xl'}`}>{item.text_original}</div>}
      {showRomaji && <div className={showKana ? 'text-lg text-muted' : 'font-display text-4xl font-bold'}>{item.text_romanized}</div>}
    </div>
  );

  const respellingFront =
    crutch === 'never' ? null : showFrontRespelling ? (
      <div className="text-center"><Respelling text={item.respelling_pt} /></div>
    ) : (
      <button className="chip mx-auto" onClick={(e) => { e.stopPropagation(); setPeek(true); }}>👁 Ver como se fala</button>
    );

  function checkTyped() {
    const sim = Math.max(similarity(typed, item.text_original), item.text_romanized ? similarity(typed, item.text_romanized) : 0);
    const r = sim >= 0.95 ? Rating.Good : sim >= 0.75 ? Rating.Hard : Rating.Again;
    onSuggest(r as Grade, sim >= 0.95 ? 'Resposta correta' : sim >= 0.75 ? 'Quase certo' : 'Resposta diferente');
    onReveal();
  }

  const typeBox =
    s.typeAnswer && (type === 'production' || type === 'listening') && !revealed ? (
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); checkTyped(); }} className="flex gap-2">
        <input autoFocus className="field" placeholder={lang === 'ja' ? 'Digite em kana ou romaji' : 'Digite a resposta'} value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button className="btn-primary">OK</button>
      </form>
    ) : null;

  let front: React.ReactNode;
  switch (type) {
    case 'recognition':
      front = (<>{original}{respellingFront}<div className="flex justify-center"><PlayButton text={item.text_original} lang={lang} rate={s.audioRate} /></div></>);
      break;
    case 'production':
      front = (<><p className="text-center text-sm font-semibold text-muted">Como se diz…</p><div className="text-center font-display text-4xl font-bold">{item.translation_pt}</div>{typeBox}</>);
      break;
    case 'listening':
      front = (<><p className="text-center text-sm font-semibold text-muted">O que foi dito?</p><div className="flex justify-center"><PlayButton big text={item.text_original} lang={lang} rate={s.audioRate} /></div><div className="flex justify-center"><button className="chip" onClick={(e) => { e.stopPropagation(); speak(item.text_original, lang, 0.55); }}>🐢 Ouvir lento</button></div>{typeBox}</>);
      break;
    case 'pronunciation':
      front = (
        <>
          {original}
          <div className="text-center"><Respelling text={item.respelling_pt} size="xl" /></div>
          <div className="flex justify-center"><PlayButton text={item.text_original} lang={lang} rate={s.audioRate} /></div>
          <PronunciationCheck
            item={item}
            lang={lang}
            onResult={(r) => {
              if (!s.autoGradePronunciation) return;
              const g = r.score >= s.pronunciationEasy ? Rating.Easy : r.score >= s.pronunciationGood ? Rating.Good : r.score >= s.pronunciationGood - 20 ? Rating.Hard : Rating.Again;
              onSuggest(g as Grade, `Nota de pronúncia ${r.score}`);
            }}
          />
        </>
      );
      break;
    case 'reading':
      front = (<><p className="text-center text-sm font-semibold text-muted">Como se lê?</p><div className="text-center font-jp text-5xl font-bold">{item.text_original}</div></>);
      break;
    case 'cloze': {
      const ex = item.example ?? '';
      const idx = ex.toLowerCase().indexOf(item.text_original.toLowerCase());
      front = (
        <>
          <p className="text-center text-sm font-semibold text-muted">Complete a frase</p>
          <div className="text-center text-2xl font-semibold">
            {ex.slice(0, idx)}<span className="mx-1 inline-block min-w-16 border-b-2 border-accent">{revealed ? item.text_original : ' '}</span>{ex.slice(idx + item.text_original.length)}
          </div>
          <p className="text-center text-muted">{item.example_pt}</p>
        </>
      );
      break;
    }
  }

  const face = 'card flex flex-col p-5 [grid-area:1/1] [backface-visibility:hidden]';
  const chips = (
    <div className="flex items-center justify-between">
      <span className="chip">{CARD_TYPE_LABEL[type]}</span>
      <span className="chip">{deck.title}</span>
    </div>
  );

  // Carta que vira: frente e verso ocupam a mesma célula; o verso começa girado 180°.
  return (
    <div className="[perspective:1200px]">
      <div
        onClick={() => !revealed && type !== 'pronunciation' && !typeBox && onReveal()}
        className={`grid min-h-[420px] cursor-pointer transition-transform duration-500 ease-out select-none [transform-style:preserve-3d] motion-reduce:transition-none ${revealed ? '[transform:rotateY(180deg)]' : ''}`}
      >
        <div className={`${face} ${revealed ? 'pointer-events-none' : ''}`} aria-hidden={revealed}>
          {chips}
          <div className="flex flex-1 flex-col justify-center gap-4 py-6">{front}</div>
          {type !== 'pronunciation' && !typeBox && <p className="text-center text-xs text-muted">Toque no card para ver a resposta</p>}
        </div>

        <div className={`${face} [transform:rotateY(180deg)] ${revealed ? '' : 'pointer-events-none'}`} aria-hidden={!revealed}>
          {chips}
          <div className="flex flex-1 flex-col justify-center gap-3 py-4 text-center">
            {original}
            <div className="font-display text-3xl font-bold text-accent">{item.translation_pt}</div>
            <div><Respelling text={item.respelling_pt} size="lg" /></div>
            {typed && <p className="text-sm text-muted">Você digitou: <b className="text-ink">{typed}</b></p>}
            <AudioBar item={item} lang={lang} rate={s.audioRate} />
            {item.tip_pt && <p className="rounded-xl bg-blue-soft p-3 text-left text-sm">{item.tip_pt}</p>}
            {item.example && type !== 'cloze' && (
              <div className="rounded-xl bg-surface-2 p-3 text-left text-sm">
                <button className="font-semibold underline decoration-dotted underline-offset-4" onClick={(e) => { e.stopPropagation(); speak(item.example!, lang, s.audioRate); }}>{item.example}</button>
                <div className="text-muted">{item.example_pt}</div>
              </div>
            )}
            {uc?.note && <p className="rounded-xl bg-warn-soft p-3 text-left text-sm">{uc.note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
