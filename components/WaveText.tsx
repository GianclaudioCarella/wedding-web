export function WaveText({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="btn-letter"
          style={{ '--i': i } as React.CSSProperties}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  )
}
