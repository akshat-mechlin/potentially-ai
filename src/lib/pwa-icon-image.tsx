/** Shared canvas for PWA icons — matches BrandMark / public/icon.svg. */
export function PwaIconImage({ size }: { size: number }) {
  const radius = Math.round(size * 0.219);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2D4739",
        borderRadius: radius,
      }}
    >
      <svg width={size * 0.625} height={size * 0.625} viewBox="0 0 32 32" fill="none">
        <path
          d="M9 17.5C9 17.5 12.5 11.5 16 11.5C19.5 11.5 23 17.5 23 17.5"
          stroke="#F9F8F4"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="9"
          y1="17.5"
          x2="12.25"
          y2="14.75"
          stroke="#F9F8F4"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity={0.7}
        />
        <line
          x1="23"
          y1="17.5"
          x2="19.75"
          y2="14.75"
          stroke="#F9F8F4"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity={0.7}
        />
        <circle cx="16" cy="10.5" r="2.75" fill="#F9F8F4" />
        <circle cx="8.5" cy="18.5" r="3.25" fill="#F9F8F4" />
        <circle cx="23.5" cy="18.5" r="3.25" fill="#F9F8F4" />
        <circle cx="16" cy="15" r="1.25" fill="#F9F8F4" opacity={0.45} />
      </svg>
    </div>
  );
}
