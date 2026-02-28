import GlowCursor from "./GlowCursor";
import ParallaxLight from "./ParallaxLight";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center flex-col relative">
      <div className="noise-overlay" />
      <ParallaxLight />
      <GlowCursor />

      <div className="absolute bottom-0 w-full flex justify-center" style={{ paddingBottom: "32px" }}>
      <nav
        className="flex items-center gap-6 fade-in-nav"
      >
        <a
          href="https://x.com/ValeoProtocol"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X (Twitter)"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
              fill="rgba(255, 255, 255, 0.8)"
            />
          </svg>
        </a>
        <a
          href="https://www.valeocash.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Website"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
            />
            <ellipse
              cx="12"
              cy="12"
              rx="4.5"
              ry="10"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
            />
            <path
              d="M2 12h20"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
            />
          </svg>
        </a>
        <a
          href="https://docs.valeocash.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Documentation"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4.5A2.5 2.5 0 0 1 6.5 2H14l6 6v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15Z"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
            />
            <path
              d="M14 2v6h6"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
            />
            <path
              d="M8 13h8M8 17h5"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </a>
        <a
          href="https://t.me/valeocash"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.2 3.1 2.6 10.5c-.6.2-.6.7 0 .9l4.5 1.7 1.7 5.5c.2.5.7.6 1.1.3l2.5-2 4.2 3.1c.5.3 1 .1 1.1-.4L21.9 4c.2-.7-.2-1.1-.7-.9ZM9.6 13.4l7.8-5.7-6.1 6.6-.4 3-1.3-3.9Z"
              fill="rgba(255, 255, 255, 0.8)"
            />
          </svg>
        </a>
      </nav>
      </div>

      <div
        className="text-center relative z-10"
        style={{ paddingBottom: "5vh" }}
      >
        <h1
          className="fade-in-title"
          style={{
            fontWeight: 300,
            fontSize: "clamp(3rem, 7vw, 5.5rem)",
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Valeo Stratum
        </h1>
        <p
          className="fade-in-date"
          style={{
            fontWeight: 300,
            fontSize: "clamp(1rem, 2vw, 1.35rem)",
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: "0.01em",
            marginTop: "16px",
            marginBottom: 0,
          }}
        >
          March 3, 2026
        </p>
      </div>
    </main>
  );
}
