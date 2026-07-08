// src/components/Fonctionnalites/FonctionnalitesHero.tsx
// Hero pour /fonctionnalites — Splitzy · Mai 2026
//
// Suppose `<LazyMotion features={domAnimation}>` au niveau racine de l'app.
// N'utilise QUE les composants `m.*` de framer-motion (bundle minimal).
//
// Skills Emil Kowalski utilisées :
//   • Text reveal stagger sur le H1
//   • Magnetic button sur le CTA orange (suit le curseur, max 8px)
//   • Spring entrance sur les 3 cards (stiffness/damping variables)
//   • Float loop sur les badges flottants
//   • Hover scale + lift sur les feature pills
//
// Design system (verrouillé — ne pas modifier) :
//   Orange #E8920A · Orange hover #B8730A · Orange soft #FFF4E5
//   Ink #1A1A1A · Charcoal #18181B · Bg #FAFAFA
//   Muted #52525B · Line #E4E4E7 · Line2 #F4F4F5

import { m, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useCallback, type MouseEvent, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
 *  Magnetic Button — suit le curseur avec spring (max ±8px)
 * ───────────────────────────────────────────────────────── */
function MagneticButton({
  children,
  className,
  onClick,
  strength = 0.3,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
  max?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 280, damping: 18, mass: 0.4 });

  const handleMove = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      x.set(Math.max(-max, Math.min(max, dx * strength)));
      y.set(Math.max(-max, Math.min(max, dy * strength)));
    },
    [x, y, strength, max]
  );

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <m.button
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{ x: sx, y: sy }}
    >
      {children}
    </m.button>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Spring presets pour les 3 cards (stiffness variable)
 * ───────────────────────────────────────────────────────── */
const cardSpring = (delay: number, stiffness: number) => ({
  initial: { opacity: 0, y: 80, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness, damping: 16, mass: 0.9, delay },
});

const floatLoop = (range = 6, duration = 3.4) => ({
  animate: { y: [0, -range, 0] },
  transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
});

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
});

const wordReveal = (delay: number) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay },
});

/* ─────────────────────────────────────────────────────────
 *  Component
 * ───────────────────────────────────────────────────────── */
export default function FonctionnalitesHero() {
  const navigate = useNavigate();

  return (
    <section className="relative isolate overflow-hidden bg-[#FAFAFA]">
      {/* Gradient navbar readability */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 100%)',
        }}
      />

      {/* Dot grid subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(24,24,27,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse 90% 70% at 60% 40%, #000 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 70% at 60% 40%, #000 30%, transparent 80%)',
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-16 px-8 pb-24 pt-28 md:pt-36 min-[1180px]:grid-cols-[55fr_45fr] min-[1180px]:gap-12">
        {/* ===== LEFT ===== */}
        <div>
          {/* Overline */}
          <m.div
            {...fadeUp(0.05)}
            className="mb-6 inline-flex items-center gap-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#3F3F46]"
          >
            <span className="h-[1.5px] w-8 bg-[#1A1A1A]" />
            Fonctionnalités
          </m.div>

          {/* H1 — text reveal stagger */}
          <h1
            className="mb-6 font-black text-[#1A1A1A]"
            style={{
              fontSize: 'clamp(40px, 5.2vw, 72px)',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
            }}
          >
            <span className="block overflow-hidden">
              <m.span {...wordReveal(0.1)} className="inline-block">
                Encaissez en 30&nbsp;sec.
              </m.span>
            </span>
            <span className="block overflow-hidden">
              <m.span {...wordReveal(0.22)} className="inline-block">
                <span className="text-[#E8920A]">Pilotez</span>{' '}
                à distance.
              </m.span>
            </span>
            <span className="block overflow-hidden">
              <m.span {...wordReveal(0.34)} className="inline-block">
                Protégez votre note.
              </m.span>
            </span>
          </h1>

          {/* Sub */}
          <m.p
            {...fadeUp(0.5)}
            className="mb-8 max-w-[460px] text-[17px] leading-[1.55] text-[#52525B]"
          >
            Paiement fractionné par QR, plan de salle en direct, équipe, insights
            IA : tout ce qu'il faut pour piloter votre établissement — même sans
            y être.
          </m.p>

          {/* CTAs */}
          <m.div {...fadeUp(0.6)} className="mb-6 flex flex-wrap items-center gap-3">
            <MagneticButton
              className="group inline-flex items-center gap-2 rounded-[10px] bg-[#E8920A] px-[22px] py-[14px] text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(232,146,10,0.3),0_4px_12px_-2px_rgba(232,146,10,0.35)] transition-colors hover:bg-[#B8730A]"
              onClick={() => navigate('/restaurant/onboarding')}
            >
              Commencer gratuitement
              <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:translate-x-[3px]">
                →
              </span>
            </MagneticButton>
            <Link
              to="/pricing"
              className="rounded-[10px] border border-[#E4E4E7] bg-transparent px-5 py-[14px] text-[15px] font-medium text-[#1A1A1A] no-underline transition-colors hover:border-[#E8920A] hover:text-[#E8920A]"
            >
              Voir les tarifs
            </Link>
          </m.div>

          {/* Feature pills */}
          <m.div {...fadeUp(0.7)} className="flex flex-wrap gap-2">
            <FeaturePill href="#paiement" icon="⚡" label="Paiement fractionné" />
            <FeaturePill href="#pilotage" icon="📊" label="Pilotage temps réel" />
            <FeaturePill href="#equipe" icon="👥" label="Équipe" />
            <FeaturePill href="#ia" icon="✨" label="IA & Réputation" />
          </m.div>
        </div>

        {/* ===== RIGHT — stack ===== */}
        <div
          className="relative mx-auto min-h-[560px] w-full max-w-[520px] min-[1180px]:max-w-none"
          style={{ perspective: 1200 }}
        >
          {/* CARD 3 — Dashboard (back) */}
          <m.div
            {...cardSpring(0.15, 110)}
            style={{ rotate: 4 }}
            className="absolute right-[-12px] top-0 w-[320px] rounded-2xl border border-[#E4E4E7] bg-white p-[18px] shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-4px_rgba(24,24,27,0.08),0_20px_48px_-8px_rgba(24,24,27,0.12)]"
          >
            <DashboardCard />
          </m.div>

          {/* CARD 2 — Feedback (middle, dark) */}
          <m.div
            {...cardSpring(0.28, 130)}
            style={{ rotate: -3 }}
            className="absolute right-[120px] top-[120px] w-[300px] rounded-2xl border border-[#27272A] bg-[#18181B] p-5 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_12px_28px_-4px_rgba(0,0,0,0.25),0_28px_56px_-8px_rgba(0,0,0,0.28)]"
          >
            <FeedbackCard />
          </m.div>

          {/* CARD 1 — Payment (front) */}
          <m.div
            {...cardSpring(0.42, 150)}
            style={{ rotate: 2 }}
            className="absolute right-[60px] top-[240px] w-[300px] rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-4px_rgba(24,24,27,0.08),0_20px_48px_-8px_rgba(24,24,27,0.12)]"
          >
            <PaymentCard />
          </m.div>

          {/* ===== Floating badges ===== */}

          {/* 1. Paiement confirmé — sur la card de paiement */}
          <FloatHost left={0} top={380} delay={1.1}>
            <m.div {...floatLoop(6, 3.4)}>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-white px-3 py-[7px] text-[12px] font-semibold text-[#15803D] shadow-[0_6px_18px_-4px_rgba(24,24,27,0.18),0_1px_2px_rgba(0,0,0,0.05)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                Paiement confirmé · 8,2 sec
              </div>
            </m.div>
          </FloatHost>

          {/* 2. Before / After — sur la card feedback */}
          <FloatHost right={0} top={90} delay={1.3}>
            <m.div {...floatLoop(8, 3.6)}>
              <BeforeAfterBadge />
            </m.div>
          </FloatHost>

          {/* 3. Nouveau feedback — vers le dashboard */}
          <FloatHost right={200} top={-14} delay={1.5}>
            <m.div {...floatLoop(5, 3.0)}>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FED7AA] bg-[#FFF4E5] px-3 py-[7px] text-[12px] font-semibold text-[#E8920A] shadow-[0_6px_18px_-4px_rgba(24,24,27,0.18),0_1px_2px_rgba(0,0,0,0.05)]">
                <span aria-hidden>🔔</span>
                Nouveau feedback
              </div>
            </m.div>
          </FloatHost>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Sous-composants
 * ───────────────────────────────────────────────────────── */

function FloatHost({
  left,
  right,
  top,
  delay,
  children,
}: {
  left?: number;
  right?: number;
  top: number;
  delay: number;
  children: ReactNode;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay }}
      style={{ position: 'absolute', left, right, top }}
    >
      {children}
    </m.div>
  );
}

function FeaturePill({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <m.a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#F4F4F5] px-3.5 py-[7px] text-[13px] font-medium text-[#27272A] no-underline"
      whileHover={{
        backgroundColor: '#FFF4E5',
        borderColor: '#E8920A',
        y: -2,
        scale: 1.03,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      <span aria-hidden className="text-[14px] leading-none">
        {icon}
      </span>
      {label}
    </m.a>
  );
}

/* ─── Card content (réplique fidèle des UI Splitzy existantes) ─── */

function PaymentCard() {
  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#1A1A1A]">Table 4</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#16A34A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.18)]" />
          Live
        </span>
      </div>
      <div className="mb-3.5 text-[11px] text-[#71717A]">
        Bistrot de la Paix · 19h42
      </div>
      <div className="text-[13px]">
        <Row qty="1×" label="Entrecôte frites" price="24,00 €" />
        <Row qty="1×" label="Coupe de vin" price="6,00 €" />
        <Row qty="1×" label="Dessert du jour" price="2,50 €" />
      </div>
      <div className="my-2 h-px bg-[#E4E4E7]" />
      <div className="mt-1.5 flex items-center justify-between text-[15px] font-bold tracking-tight">
        <span>Total</span>
        <span>32,50 €</span>
      </div>
      <button className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#E8920A] px-3 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_12px_-2px_rgba(232,146,10,0.4)]">
        Payer 32,50 € →
      </button>
      <div className="mt-2.5 flex items-center justify-center gap-2.5 text-[11px] text-[#71717A]">
        <span className="rounded-md border border-[#E4E4E7] bg-white px-2 py-[3px] font-medium">
           Pay
        </span>
        <span className="rounded-md border border-[#E4E4E7] bg-white px-2 py-[3px] font-medium">
          G Pay
        </span>
        <span className="rounded-md border border-[#E4E4E7] bg-white px-2 py-[3px] font-medium">
          CB
        </span>
      </div>
    </>
  );
}

function Row({ qty, label, price }: { qty: string; label: string; price: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[#27272A]">
      <span>
        <span className="mr-1.5 text-[11px] text-[#A1A1AA]">{qty}</span>
        {label}
      </span>
      <span>{price}</span>
    </div>
  );
}

function FeedbackCard() {
  return (
    <>
      <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(232,146,10,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#E8920A]">
        <span className="h-[5px] w-[5px] rounded-full bg-[#E8920A]" />
        Privé
      </div>
      <div className="mb-3 text-[14px] font-medium leading-snug">
        Comment s'est passé votre repas&nbsp;?
      </div>
      <div className="mb-3.5 tracking-[2px] text-[18px] text-[#FBB73B]">
        ★★<span className="text-[#3F3F46]">★★★</span>
      </div>
      <div className="min-h-[48px] rounded-lg border border-[#3F3F46] bg-[#27272A] p-2.5 text-[13px] leading-snug text-[#D4D4D8]">
        « Entrée un peu froide, sinon top… »
      </div>
      <button className="mt-3 w-full rounded-lg bg-white px-3 py-2.5 text-[13px] font-semibold text-[#1A1A1A]">
        Envoyer au restaurant →
      </button>
      <div className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-[#A1A1AA]">
        <span aria-hidden>🔒</span>
        Ce message va au gérant, pas sur Google.
      </div>
    </>
  );
}

function DashboardCard() {
  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#3F3F46]">Dashboard</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#16A34A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.18)]" />
          Live
        </span>
      </div>
      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-medium text-[#71717A]">Note moyenne</div>
          <div className="mt-0.5 flex items-baseline gap-1 text-[22px] font-extrabold tracking-tight text-[#E8920A]">
            <span className="text-[14px]">★</span>4,6
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-[#71717A]">Feedbacks</div>
          <div className="mt-0.5 text-[22px] font-extrabold tracking-tight">23</div>
        </div>
      </div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#71717A]">
        <span>Satisfaction</span>
        <span className="font-semibold text-[#1A1A1A]">94%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#F4F4F5]">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: '94%' }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}
          className="h-full rounded-full bg-[#E8920A]"
        />
      </div>
      <div className="mt-3.5 flex h-9 items-end gap-1">
        {[40, 62, 48, 74, 58, 82, 94].map((h, i) => (
          <m.i
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.8 + i * 0.05 }}
            className={`flex-1 rounded-[2px] ${i === 6 ? 'bg-[#E8920A]' : 'bg-[#E4E4E7]'}`}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Before/After badge ─── */

function BeforeAfterBadge() {
  return (
    <div className="flex min-w-[188px] flex-col gap-1.5 rounded-[14px] border border-[#E4E4E7] bg-white px-3.5 py-2.5 text-[12px] shadow-[0_12px_28px_-6px_rgba(24,24,27,0.18),0_1px_2px_rgba(0,0,0,0.05)]">
      {/* BEFORE — Google */}
      <div className="flex items-center gap-2">
        <span className="tracking-[1px] text-[13px] font-bold text-[#A1A1AA]">★★</span>
        <span className="font-bold text-[#A1A1AA]">→</span>
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[11px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg,#4285F4,#34A853)' }}
        >
          G
        </span>
        <span className="flex-1 text-[12px] font-semibold text-[#71717A]">
          <span className="relative">
            Google
            <span
              aria-hidden
              className="absolute inset-x-[-2px] top-1/2 h-[2px] bg-[#DC2626]"
              style={{ transform: 'rotate(-6deg)' }}
            />
          </span>
        </span>
      </div>

      <div className="-mx-1 h-px bg-[#F4F4F5]" />

      {/* AFTER — Splitzy */}
      <div className="flex items-center gap-2">
        <span className="tracking-[1px] text-[13px] font-bold text-[#E8920A]">★★</span>
        <span className="font-bold text-[#A1A1AA]">→</span>
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[#E8920A] text-[11px] font-extrabold text-white">
          S
        </span>
        <span className="flex-1 text-[12px] font-semibold text-[#1A1A1A]">
          Splitzy <span className="font-extrabold text-[#16A34A]">✓</span>
        </span>
      </div>
    </div>
  );
}
