export interface CountdownConfig {
  targetDate: string; // ISO 8601
  name: string;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diffParts(targetMs: number, nowMs: number): Parts {
  const remaining = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function plural(n: number, one: string): string {
  return `${n} ${one}${n === 1 ? '' : 's'}`;
}

export function startCountdown(cfg: CountdownConfig): () => void {
  const targetMs = new Date(cfg.targetDate).getTime();
  const timeEl = document.getElementById('countdown-time');
  const signEl = document.getElementById('countdown-sign');
  if (signEl) signEl.textContent = `I miss you ${cfg.name} <3`;

  const tick = () => {
    if (!timeEl) return;
    const p = diffParts(targetMs, Date.now());
    timeEl.textContent =
      `${plural(p.days, 'day')}, ${plural(p.hours, 'hour')}, ` +
      `${plural(p.minutes, 'minute')}, ${plural(p.seconds, 'second')}`;
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
