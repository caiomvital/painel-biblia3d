'use client';

import React, { useId } from 'react';
import { COSMETICS, type SlotName } from '@/lib/cosmetics';
import { DAVI_PARTS, type DaviLookKey } from '@/lib/davi-parts';

const DAVI_SLOT_KEY: Partial<Record<SlotName, DaviLookKey>> = { DAVI_HEAD: 'daviHead', DAVI_TUNIC: 'daviTunic', DAVI_BOOTS: 'daviBoots', DAVI_WRISTS: 'daviWrists' };

/** Prévia de um item do catálogo (desenho próprio em SVG, sem imagens externas). Decorativa: o nome vem em texto. */
export function ItemIcon({ code, size = 3, className }: { code: string; size?: number; className?: string }) {
  const gid = useId();
  const def = COSMETICS.find((c) => c.code === code);
  const [a, b] = def?.tint ?? ['#bdb8e6', '#4a428f'];
  const slot: SlotName = def?.slot ?? 'COLOR';
  const daviKey = DAVI_SLOT_KEY[slot];
  if (daviKey) {
    const file = DAVI_PARTS[daviKey].find((p) => p.code === code)?.file;
    const src = file ? (daviKey === 'daviBoots' || daviKey === 'daviWrists' ? `/davi/${file}-e.png` : `/davi/${file}.png`) : null;
    return (
      <span className={className} aria-hidden="true" style={{ display: 'inline-flex', width: `${size}rem`, height: `${size}rem`, alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width={`${size}rem`} height={`${size}rem`} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      {slot === 'COLOR' && (
        <>
          <rect x="7" y="9" width="34" height="30" rx="10" fill={`url(#${gid}-g)`} stroke="#15123a" strokeWidth="2.5" />
          <rect x="12" y="17" width="24" height="12" rx="6" fill="#2b2250" />
          <circle cx="19" cy="23" r="2.6" fill="#5ad1ff" />
          <circle cx="29" cy="23" r="2.6" fill="#5ad1ff" />
        </>
      )}
      {slot === 'BACKGROUND' && (
        <>
          <rect x="5" y="5" width="38" height="38" rx="9" fill={`url(#${gid}-g)`} stroke="#15123a" strokeWidth="2.5" />
          {code === 'bg-noite' && [[14, 14], [32, 12], [26, 30], [12, 32]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#ffd23f" />)}
          {code === 'bg-ceu' && <ellipse cx="18" cy="30" rx="9" ry="4.5" fill="#ffffff" opacity="0.85" />}
          {code === 'bg-aurora' && <path d="M8 34c8-14 16 2 32-14" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />}
        </>
      )}
      {slot === 'FRAME' && (
        <>
          <rect x="6" y="6" width="36" height="36" rx="8" fill="none" stroke={`url(#${gid}-g)`} strokeWidth="7" />
          <rect x="6" y="6" width="36" height="36" rx="8" fill="none" stroke="#15123a" strokeWidth="1.5" />
          {code === 'frame-estrelas' && [[7, 7], [41, 7], [7, 41], [41, 41]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#fff6c9" />)}
        </>
      )}
      {slot === 'ACCESSORY' && (
        <g stroke="#15123a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {code === 'acc-oculos' && (<><circle cx="16" cy="26" r="8" fill="#ffffff" fillOpacity="0.35" stroke={b} /><circle cx="32" cy="26" r="8" fill="#ffffff" fillOpacity="0.35" stroke={b} /><path d="M24 26h0M8 24 4 20M40 24l4-4" stroke={b} /></>)}
          {code === 'acc-bone' && (<><path d="M8 28a16 16 0 0 1 32 0Z" fill={`url(#${gid}-g)`} /><path d="M26 28h18c0 4-6 5-18 3Z" fill={b} /></>)}
          {code === 'acc-laco' && (<><path d="M24 26 10 15v22Z" fill={`url(#${gid}-g)`} /><path d="M24 26l14-11v22Z" fill={`url(#${gid}-g)`} /><circle cx="24" cy="26" r="4.5" fill="#ffd23f" /></>)}
          {code === 'acc-fones' && (<><path d="M9 28a15 15 0 0 1 30 0" fill="none" stroke={b} strokeWidth="3.5" /><rect x="5" y="26" width="8" height="13" rx="4" fill={`url(#${gid}-g)`} /><rect x="35" y="26" width="8" height="13" rx="4" fill={`url(#${gid}-g)`} /></>)}
          {code === 'acc-coroa' && (<><path d="M7 36 9 16l9 9 6-12 6 12 9-9 2 20Z" fill={`url(#${gid}-g)`} /><circle cx="24" cy="30" r="2.6" fill="#ff5d73" /></>)}
        </g>
      )}
    </svg>
  );
}
