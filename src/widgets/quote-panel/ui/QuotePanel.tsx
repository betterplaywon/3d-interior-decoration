import { useState } from 'react';
import { useQuote } from '../api/useQuote';
import { formatKRW, formatNumber } from '../lib/formatKRW';

const SURFACE_LABEL = {
  floor: '바닥',
  wall: '벽',
  ceiling: '천장',
} as const;

export function QuotePanel() {
  const quote = useQuote();
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="panel quote">
      <header className="quote-head">
        <button
          type="button"
          className="quote-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className={`quote-caret ${expanded ? 'open' : ''}`} aria-hidden>
            ▸
          </span>
          <h3>견적</h3>
        </button>
        <strong className="quote-total">{formatKRW(quote.total)}</strong>
      </header>

      {expanded && (
        <>
          <dl className="quote-lines">
            <dt>마감재</dt>
            <dd>
              <span>{formatKRW(quote.texture)}</span>
              <small className="muted">
                {quote.textureLineDetails.length} 면
              </small>
            </dd>

            <dt>조명</dt>
            <dd>
              <span>{formatKRW(quote.lighting)}</span>
              <small className="muted">{quote.lightingCount} 개</small>
            </dd>

            <dt>위생도기</dt>
            <dd>
              <span>{formatKRW(quote.fixture)}</span>
              <small className="muted">{quote.fixtureCount} 개</small>
            </dd>

            <dt>조달 가산</dt>
            <dd>
              <span>+{formatKRW(quote.shippingSurcharge)}</span>
              <small className="muted">해외 sea·air</small>
            </dd>
          </dl>

          {quote.textureLineDetails.length > 0 && (
            <details className="quote-breakdown">
              <summary>마감재 상세 (룸 × 면)</summary>
              <ul className="quote-detail-list">
                {quote.textureLineDetails.map((line, idx) => (
                  <li key={`${line.roomId}-${line.surface}-${idx}`}>
                    <span className="quote-detail-room">
                      {line.roomName} · {SURFACE_LABEL[line.surface]}
                    </span>
                    <span className="quote-detail-calc muted">
                      {formatNumber(line.area)}㎡ × {formatKRW(line.pricePerSqmKRW)}
                    </span>
                    <span className="quote-detail-sub">{formatKRW(line.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
