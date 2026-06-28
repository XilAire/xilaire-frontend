/**
 * Canonical Signal type for CASE Trades
 * Options-first, stocks supported
 */

export type Signal = {
  id: string;

  /* -------------------------------------------------
     INSTRUMENT
  ------------------------------------------------- */

  // Underlying symbol (e.g. QQQ, SPY, AAPL)
  underlying: string;

  // What kind of instrument this signal represents
  instrument_type: "OPTION" | "STOCK";

  /* -------------------------------------------------
     ACTION
  ------------------------------------------------- */

  // Trade direction
  action: "BUY" | "SELL";

  /* -------------------------------------------------
     OPTIONS CONTRACT (OPTION ONLY)
     These are required when instrument_type = OPTION
  ------------------------------------------------- */

  // CALL or PUT
  option_type?: "CALL" | "PUT";

  // Strike price (e.g. 698)
  strike_price?: number;

  // Expiration date (ISO string: YYYY-MM-DD)
  expiration_date?: string;

  /* -------------------------------------------------
     TRADE LOGIC
  ------------------------------------------------- */

  // Entry price of the contract or stock
  entry_price: number;

  // Trade duration intent
  trade_style: "scalp" | "swing" | "leap";

  // Human-readable explanation of why this trade exists
  rationale?: string;

  // Risk management
  stop_loss_pct?: number;     // e.g. -30
  take_profit_pct?: number;  // optional

  /* -------------------------------------------------
     PLATFORM STATE
  ------------------------------------------------- */

  confidence?: number;

  status: "Active" | "Triggered" | "Expired";

  // User interaction flags
  watching: boolean;
  watched: boolean;

  /* -------------------------------------------------
     SYSTEM
  ------------------------------------------------- */

  created_at: string;
};
