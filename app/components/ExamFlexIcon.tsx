import { useId } from "react";

/**
 * ExamFlex app icon (open book + leaf on an ivory rounded square).
 * Source: https://res.cloudinary.com/itztxiph/image/upload/v1795381824/examflex-icon.svg
 * Inlined so it renders without a network request; gradient ids are scoped per instance.
 */
export function ExamFlexIcon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const book = `${id}-book`;
  const leaf = `${id}-leaf`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={book} x1="80" y1="80" x2="420" y2="430" gradientUnits="userSpaceOnUse">
          <stop stopColor="#08745A" />
          <stop offset="1" stopColor="#034B3C" />
        </linearGradient>
        <linearGradient id={leaf} x1="185" y1="100" x2="340" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8DBB65" />
          <stop offset="1" stopColor="#4E9650" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#F5F2E8" />
      <path
        d="M256 382c-49-31-100-46-158-46V164c61 0 111 17 158 51 47-34 97-51 158-51v172c-58 0-109 15-158 46Z"
        fill={`url(#${book})`}
      />
      <path d="M256 215c-41-30-86-45-139-47v136c51 2 96 17 139 45V215Z" fill="#F5F2E8" />
      <path d="M256 215c41-30 86-45 139-47v136c-51 2-96 17-139 45V215Z" fill="#E6EBDD" />
      <path d="M256 215v134" stroke="#08745A" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M190 164c17-48 62-79 117-80-6 50-43 87-96 99-12 3-20-7-21-19Z"
        fill={`url(#${leaf})`}
      />
      <path
        d="M205 169c26-25 54-43 91-60"
        fill="none"
        stroke="#F5F2E8"
        strokeWidth="8"
        strokeLinecap="round"
        opacity=".85"
      />
      <circle cx="362" cy="115" r="13" fill="#8DBB65" />
      <path
        d="M362 88v-13M362 155v-13M335 115h-13M402 115h-13"
        stroke="#8DBB65"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
