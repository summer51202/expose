type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div>
      <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold text-stone-900">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
