"use client";

export function PrintButton() {
  return (
    <button type="button" className="kc-btn kc-btn-secondary" onClick={() => window.print()}>
      Cetak
    </button>
  );
}
