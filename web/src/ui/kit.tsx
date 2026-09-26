import type { CSSProperties, ReactNode } from 'react';
import { DISCLAIMER, SPECIES_META } from '../data/catalog';
import type { Animal, FarmEvent } from '../data/types';
import type { Level } from '../logic/animal';
import { useStore } from '../store';

export const DOT: Record<Level, string> = { green: 'var(--green-dot)', yellow: 'var(--yellow-dot)', red: 'var(--red-dot)' };
export const BG: Record<Level, string> = { green: 'var(--green-bg)', yellow: 'var(--yellow-bg)', red: 'var(--red-bg)' };
export const FG: Record<Level, string> = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' };

export function Screen({ title, children, right, noBack }: { title?: string; children: ReactNode; right?: ReactNode; noBack?: boolean }) {
  const { back } = useStore();
  return (
    <>
      {title !== undefined && (
        <header className="header">
          {!noBack && (
            <button className="icon-btn" onClick={back} aria-label="Geri">‹</button>
          )}
          <h1>{title}</h1>
          {right}
        </header>
      )}
      <main className="body">{children}</main>
    </>
  );
}

export function Card({ children, level, onClick, style, className = '' }: { children: ReactNode; level?: Level; onClick?: () => void; style?: CSSProperties; className?: string }) {
  const cls = `card ${level ? 'lv-' + level : ''} ${onClick ? 'tap' : ''} ${className}`;
  if (onClick) {
    return (
      <div role="button" tabIndex={0} className={cls} style={style} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        {children}
      </div>
    );
  }
  return <div className={cls} style={style}>{children}</div>;
}

export function Btn({ label, icon, onClick, color, big, outline, style, disabled }: {
  label: string; icon?: string; onClick: () => void; color?: string; big?: boolean; outline?: boolean; style?: CSSProperties; disabled?: boolean;
}) {
  const c = color ?? 'var(--primary)';
  return (
    <button
      className={`btn ${big ? 'big' : ''} ${outline ? 'outline' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{ ...(outline ? { borderColor: c, color: c } : { background: c }), ...style }}
    >
      {icon && <span className="ic">{icon}</span>}
      {label}
    </button>
  );
}

export function Chip({ label, on, onClick, icon }: { label: string; on?: boolean; onClick: () => void; icon?: string }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} onClick={onClick}>
      {icon ? `${icon} ` : ''}{label}
    </button>
  );
}

export function Tag({ label, level }: { label: string; level: Level }) {
  return <span className={`tag ${level}`}>{label}</span>;
}

export function Dot({ level, size = 18 }: { level: Level; size?: number }) {
  return <span className="dot" style={{ background: DOT[level], width: size, height: size }} />;
}

const AVATAR_BG = ['#FCE4C4', '#E0EDD8', '#DCE7F5', '#F4DDE6', '#EDE3F7', '#FFF0B8'];

export function Avatar({ animal, size = 64 }: { animal: Animal; size?: number }) {
  if (animal.photo_url) return <img className="avatar" src={animal.photo_url} alt={animal.name} style={{ width: size, height: size }} />;
  return (
    <span className="avatar" style={{ width: size, height: size, background: AVATAR_BG[animal.id % AVATAR_BG.length], fontSize: size * 0.55 }}>
      {SPECIES_META[animal.species]?.icon ?? '🐄'}
    </span>
  );
}

/** FR-18: kayıt kaynağı rozeti */
export function SourceBadge({ e }: { e: FarmEvent }) {
  return e.verified_by
    ? <span className="badge vet" title={e.verified_by}>🩺 Veteriner onaylı</span>
    : <span className="badge farmer">👤 Besici girdi</span>;
}

export function Disclaimer() {
  return <div className="disclaimer"><span style={{ fontStyle: 'normal' }}>ℹ️</span><span>{DISCLAIMER}</span></div>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="col" style={{ gap: 10 }}>
      <div className="row between">
        <h2 className="h2">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
