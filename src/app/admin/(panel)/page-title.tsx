// Título padrão das telas do painel (mesma linguagem do site)
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
