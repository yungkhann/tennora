export function CourtArt() {
  return (
    <svg
      viewBox="0 0 600 560"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <circle cx="336" cy="270" r="222" stroke="#153D32" strokeOpacity=".12" />
      <circle cx="336" cy="270" r="180" stroke="#153D32" strokeOpacity=".12" />
      <path
        d="M74 421 300 157 602 276 374 544Z"
        fill="#153D32"
        fillOpacity=".12"
      />
      <path d="m58 364 227-264 302 119-228 268Z" fill="#123F36" />
      <path d="m58 364 301 123v15L58 379Z" fill="#092E28" />
      <path d="m359 487 228-268v15L359 502Z" fill="#20624F" />
      <path
        d="m69 361 220-249 285 112-218 250Z"
        stroke="#E5F4DB"
        strokeWidth="3"
      />
      <path
        d="m177 236 299 120M213 419l219-252"
        stroke="#E5F4DB"
        strokeWidth="2"
      />
      <path
        d="m162 235 322 124v-52L162 183Z"
        fill="#173E35"
        fillOpacity=".7"
        stroke="#E5F4DB"
        strokeWidth="2"
      />
      {Array.from({ length: 28 }, (_, i) => (
        <path
          key={i}
          d={`m${167 + i * 11.4} ${185 + i * 4.4}v50`}
          stroke="#E5F4DB"
          strokeOpacity=".4"
        />
      ))}
      <path
        d="m162 196 322 124m-322-111 322 124m-322-111 322 124"
        stroke="#E5F4DB"
        strokeOpacity=".5"
      />
      <path
        d="M195 157C277-39 519 32 433 184"
        stroke="#F7F6F0"
        strokeWidth="2"
        strokeDasharray="5 8"
      />
      <ellipse
        cx="422"
        cy="248"
        rx="33"
        ry="12"
        transform="rotate(21 422 248)"
        fill="#041F1A"
        fillOpacity=".25"
      />
      <circle cx="435" cy="181" r="27" fill="#F7F6F0" />
      <circle cx="428" cy="173" r="13" fill="white" fillOpacity=".6" />
      <path
        d="m99 438-23 32"
        stroke="#123F36"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <ellipse
        cx="128"
        cy="400"
        rx="40"
        ry="52"
        transform="rotate(35 128 400)"
        fill="#C9EF59"
        stroke="#153D32"
        strokeWidth="3"
      />
      <path
        d="m109 393 41 22"
        stroke="#153D32"
        strokeOpacity=".2"
        strokeWidth="2"
      />
    </svg>
  );
}
