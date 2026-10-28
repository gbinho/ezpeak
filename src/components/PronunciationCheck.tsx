'use client';
import { useRef, useState } from 'react';
import { canRecognize, recognize, scorePronunciation, speak, startRecording, wordDiff } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import type { Item, Lang } from '@/lib/types';
import Respelling from './Respelling';

export type PronResult = { score: number; transcript: string };

export default function PronunciationCheck({ item, lang, onResult }: { item: Item; lang: Lang; onResult?: (r: PronResult) => void }) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<PronResult | null>(null);
  const [error, setError] = useState('');
  const [myAudio, setMyAudio] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  if (!canRecognize())
    return (
      <p className="rounded-xl bg-warn-soft p-3 text-sm text-ink">
        Seu navegador não tem reconhecimento de voz. Use Chrome ou Edge para a avaliação de pronúncia. Enquanto isso, ouça e repita em voz alta.
      </p>
    );

  async function start() {
    setStatus('listening');
    setResult(null);
    setError('');
    let recorder: Awaited<ReturnType<typeof startRecording>> | null = null;
    try {
      recorder = await startRecording();
    } catch {
      /* gravação é opcional; o reconhecimento pode funcionar sem ela */
    }
    const r = recognize(lang);
    stopRef.current = r.stop;
    try {
      const { transcripts, confidence } = await r.promise;
      if (recorder) setMyAudio(await recorder.stop());
      const targets = [item.text_original, item.text_romanized ?? ''].filter(Boolean);
      const res = transcripts.length ? scorePronunciation(transcripts, targets, confidence) : { score: 0, transcript: '' };
      setResult(res);
      setStatus('done');
      onResult?.(res);
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from('pronunciation_attempts').insert({ user_id: data.user.id, item_id: item.id, transcript: res.transcript, score: res.score });
    } catch (e) {
      if (recorder) await recorder.stop();
      setError((e as Error).message === 'not-allowed' ? 'Permita o acesso ao microfone.' : 'Não consegui ouvir. Tente de novo.');
      setStatus('error');
    }
  }

  const tone = !result ? '' : result.score >= 85 ? 'bg-good-soft text-good' : result.score >= 60 ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad';

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={status === 'listening' ? () => stopRef.current() : start}
        className={`btn w-full ${status === 'listening' ? 'bg-bad text-white' : 'btn-primary'}`}
      >
        {status === 'listening' ? '● Ouvindo… toque para parar' : result ? '🎤 Tentar de novo' : '🎤 Falar agora'}
      </button>
      {error && <p className="text-center text-sm text-bad">{error}</p>}
      {result && (
        <div className={`rounded-xl p-3 ${tone}`}>
          <div className="flex items-center justify-between">
            <span className="font-display text-3xl font-extrabold">{result.score}</span>
            <span className="text-sm font-semibold">
              {result.score >= 85 ? 'Excelente!' : result.score >= 60 ? 'Quase lá' : 'Vamos de novo'}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink">
            Ouvi: <b>{result.transcript || '—'}</b>
          </p>
          {lang === 'en' && result.transcript && item.text_original.includes(' ') && (
            <div className="mt-2 flex flex-wrap gap-1">
              {wordDiff(item.text_original, result.transcript).map((w, i) => (
                <span key={i} className={`rounded-md px-1.5 py-0.5 text-sm font-semibold ${w.ok ? 'bg-good text-white' : w.partial ? 'bg-warn text-white' : 'bg-bad text-white'}`}>
                  {w.word}
                </span>
              ))}
            </div>
          )}
          {result.score < 85 && (
            <div className="mt-2 text-sm text-ink">
              Repita devagar: <Respelling text={item.respelling_pt} size="md" />
              {item.tip_pt && <p className="mt-1 text-muted">💡 {item.tip_pt}</p>}
            </div>
          )}
        </div>
      )}
      {myAudio && (
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => speak(item.text_original, lang)}>▶ Nativo</button>
          <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => new Audio(myAudio).play()}>▶ Você</button>
        </div>
      )}
    </div>
  );
}
