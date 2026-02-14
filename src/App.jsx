import { useEffect, useMemo, useRef, useState } from "react";
import { ROTATE_INTERVAL_MS, SYMBOLS } from "./config/symbols";
import { fetchQuote } from "./services/quoteService";
import { formatPercent, formatPrice, formatSigned, formatTime } from "./utils/format";

const SETTINGS_STORAGE_KEY = "price-monitor-settings-v1";
const INTERVAL_OPTIONS = [5000, 10000, 15000, 30000];

function getInitialSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.selectedSymbolIds) || parsed.selectedSymbolIds.length === 0) {
      return null;
    }

    return {
      selectedSymbolIds: parsed.selectedSymbolIds,
      rotateIntervalMs: Number(parsed.rotateIntervalMs) || ROTATE_INTERVAL_MS,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const initialSettings = useMemo(() => getInitialSettings(), []);
  const [selectedSymbolIds, setSelectedSymbolIds] = useState(
    initialSettings?.selectedSymbolIds ?? SYMBOLS.map((item) => item.id)
  );
  const [rotateIntervalMs, setRotateIntervalMs] = useState(
    initialSettings?.rotateIntervalMs ?? ROTATE_INTERVAL_MS
  );
  const [showSettings, setShowSettings] = useState(false);
  const symbols = useMemo(
    () => SYMBOLS.filter((item) => selectedSymbolIds.includes(item.id)),
    [selectedSymbolIds]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [quotes, setQuotes] = useState({});
  const [errorById, setErrorById] = useState({});
  const [loading, setLoading] = useState(true);
  const touchStartXRef = useRef(0);
  const hasTouchStartRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        selectedSymbolIds,
        rotateIntervalMs,
      })
    );
  }, [rotateIntervalMs, selectedSymbolIds]);

  useEffect(() => {
    if (activeIndex < symbols.length) {
      return;
    }

    setActiveIndex(0);
  }, [activeIndex, symbols.length]);

  useEffect(() => {
    if (!symbols.length) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const updateQuote = async (index) => {
      const symbol = symbols[index];
      setLoading(true);

      try {
        const nextQuote = await fetchQuote(symbol);
        if (cancelled) {
          return;
        }

        setQuotes((prev) => ({ ...prev, [symbol.id]: nextQuote }));
        setErrorById((prev) => ({ ...prev, [symbol.id]: "" }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorById((prev) => ({
          ...prev,
          [symbol.id]: error instanceof Error ? error.message : "Failed to load quote",
        }));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    updateQuote(activeIndex);
    return () => {
      cancelled = true;
    };
  }, [activeIndex, symbols]);

  useEffect(() => {
    if (symbols.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % symbols.length);
    }, rotateIntervalMs);

    return () => clearInterval(timer);
  }, [rotateIntervalMs, symbols.length]);

  const activeSymbol = symbols[activeIndex];
  const activeQuote = activeSymbol ? quotes[activeSymbol.id] : null;
  const activeError = activeSymbol ? errorById[activeSymbol.id] : "";
  const isUp = (activeQuote?.change ?? 0) >= 0;
  const rotateSeconds = Math.floor(rotateIntervalMs / 1000);

  const handleSwitch = (direction) => {
    if (symbols.length <= 1) {
      return;
    }

    setActiveIndex((prev) => {
      if (direction === "prev") {
        return (prev - 1 + symbols.length) % symbols.length;
      }

      return (prev + 1) % symbols.length;
    });
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
    hasTouchStartRef.current = true;
  };

  const handleTouchEnd = (event) => {
    if (!hasTouchStartRef.current) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? 0;
    const deltaX = touchEndX - touchStartXRef.current;
    hasTouchStartRef.current = false;

    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX > 0) {
      handleSwitch("prev");
    } else {
      handleSwitch("next");
    }
  };

  const handleToggleSymbol = (symbolId) => {
    setSelectedSymbolIds((prev) => {
      if (prev.includes(symbolId)) {
        if (prev.length === 1) {
          return prev;
        }

        return prev.filter((id) => id !== symbolId);
      }

      return [...prev, symbolId];
    });
  };

  return (
    <main className="page">
      <section className="card" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="toolbar">
          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings((prev) => !prev)}
          >
            {showSettings ? "Close" : "Settings"}
          </button>
        </div>

        {showSettings ? (
          <div className="settings-panel">
            <label className="setting-field">
              <span>Rotate interval</span>
              <select
                value={rotateIntervalMs}
                onChange={(event) => setRotateIntervalMs(Number(event.target.value))}
              >
                {INTERVAL_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {Math.floor(item / 1000)}s
                  </option>
                ))}
              </select>
            </label>

            <div className="setting-group">
              <span>Symbols</span>
              <div className="symbol-options">
                {SYMBOLS.map((item) => (
                  <label key={item.id} className="symbol-option">
                    <input
                      type="checkbox"
                      checked={selectedSymbolIds.includes(item.id)}
                      onChange={() => handleToggleSymbol(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!showSettings && symbols.length ? (
          <div className="switch-row">
            <button type="button" className="switch-btn" onClick={() => handleSwitch("prev")}>
              ‹
            </button>
            <span className="switch-hint">Swipe to switch</span>
            <button type="button" className="switch-btn" onClick={() => handleSwitch("next")}>
              ›
            </button>
          </div>
        ) : null}

        {!symbols.length ? <p className="status error">Please select at least one symbol</p> : null}

        <div className="ticker-row">
          <div className="pair">
            <span className="asset">{activeSymbol?.label ?? "--"}</span>
            <span className="slash">/</span>
            <span className="quote">{activeSymbol?.pair ?? "--"}</span>
          </div>
          <div className="source">
            {activeQuote?.sourceTag ?? "--"}
            {activeQuote?.demoSource ? " Demo" : ""}
          </div>
        </div>

        <div className="price-wrap">
          <span className="currency">$</span>
          <span className="price">{activeQuote ? formatPrice(activeQuote.price) : "--"}</span>
        </div>

        <p className="subtitle">Market price of {activeSymbol?.name ?? "asset"}</p>

        <div className={`change-row ${isUp ? "up" : "down"}`}>
          <span>{activeQuote ? formatSigned(activeQuote.change, 2) : "--"}</span>
          <span>({activeQuote ? formatPercent(activeQuote.changePct) : "--"})</span>
        </div>

        <div className="meta">
          <span>Updated: {activeQuote ? formatTime(activeQuote.asOf) : "--"}</span>
          <span>Next rotate: {rotateSeconds}s</span>
        </div>

        {loading && !activeQuote ? <p className="status">Loading quote...</p> : null}
        {!loading && activeError ? <p className="status error">Data temporary unavailable</p> : null}
      </section>
    </main>
  );
}
