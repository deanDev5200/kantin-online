"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, parseRupiahInput } from "@/lib/money";

type Item = { id: string; name: string; unitPriceRupiah: number; quantity: number };

type Lookup = {
  studentId: string;
  fullName: string;
  grha: string;
  cardStatus: "ACTIVE" | "BLOCKED";
  hasPin: boolean;
  monthlyLimitRupiah: number | null;
  monthSpentRupiah: number;
  balanceRupiah: number;
};

type Stage = "cart" | "await-card" | "await-pin" | "processing" | "success";

let nextId = 1;
function newId() {
  return `it-${nextId++}`;
}

export function CashierTerminal() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const [stage, setStage] = useState<Stage>("cart");
  const [cardUid, setCardUid] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((a, it) => a + it.unitPriceRupiah * it.quantity, 0);

  const addItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const price = parseRupiahInput(priceInput);
      const qty = Number(qtyInput);
      if (!nameInput.trim()) {
        setError("Nama barang wajib diisi");
        return;
      }
      if (price == null || price <= 0) {
        setError("Harga tidak valid");
        return;
      }
      if (!Number.isInteger(qty) || qty <= 0) {
        setError("Jumlah tidak valid");
        return;
      }
      setItems((prev) => [
        ...prev,
        { id: newId(), name: nameInput.trim(), unitPriceRupiah: price, quantity: qty },
      ]);
      setNameInput("");
      setPriceInput("");
      setQtyInput("1");
    },
    [nameInput, priceInput, qtyInput],
  );

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function startPayment() {
    if (items.length === 0) {
      setError("Keranjang kosong");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setCardUid("");
    setLookup(null);
    setPin("");
    setStage("await-card");
  }

  // Focus the hidden card input when awaiting a tap.
  useEffect(() => {
    if (stage === "await-card") {
      cardInputRef.current?.focus();
    }
  }, [stage]);

  // Focus the PIN input when awaiting a PIN.
  useEffect(() => {
    if (stage === "await-pin") {
      pinInputRef.current?.focus();
    }
  }, [stage]);

  async function onCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uid = cardUid.trim();
    if (!uid) return;
    setError(null);
    setStage("processing");
    const res = await fetch("/api/cashier/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardUid: uid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Kartu tidak dikenali");
      setStage("await-card");
      setCardUid("");
      return;
    }
    setLookup(data);
    if (data.cardStatus === "BLOCKED") {
      setError("Kartu diblokir. Tidak dapat melakukan pembayaran.");
      setStage("await-card");
      setCardUid("");
      return;
    }
    if (!data.hasPin) {
      setError("Siswa belum membuat PIN kartu.");
      setStage("await-card");
      setCardUid("");
      return;
    }
    if (data.balanceRupiah < total) {
      setError(
        `Saldo tidak cukup. Saldo tersedia: ${formatRupiah(
          data.balanceRupiah,
        )}, total belanja: ${formatRupiah(total)}.`,
      );
      setStage("await-card");
      setCardUid("");
      return;
    }
    setStage("await-pin");
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!lookup) return;
    if (!/^[0-9]{6}$/.test(pin)) {
      setError("PIN harus 6 digit angka");
      return;
    }
    setError(null);
    setStage("processing");
    const res = await fetch("/api/cashier/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardUid: lookup.studentId ? cardUid.trim() : cardUid.trim(),
        pin,
        items: items.map((it) => ({
          name: it.name,
          unitPriceRupiah: it.unitPriceRupiah,
          quantity: it.quantity,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Pembayaran gagal");
      setPin("");
      setStage("await-pin");
      return;
    }
    setSuccessMsg(
      `Pembayaran berhasil: ${data.studentName} - ${formatRupiah(data.totalRupiah)}`,
    );
    setItems([]);
    setLookup(null);
    setPin("");
    setCardUid("");
    setStage("success");
    router.refresh();
  }

  function cancelFlow() {
    setError(null);
    setLookup(null);
    setPin("");
    setCardUid("");
    setStage("cart");
  }

  function appendPinDigit(d: string) {
    setPin((prev) => (prev.length >= 6 ? prev : prev + d));
  }

  function backspacePin() {
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="kc-card p-3 border-l-4" style={{ borderLeftColor: "var(--danger)" }}>
          <p className="kc-error">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="kc-card p-3 border-l-4" style={{ borderLeftColor: "var(--success)" }}>
          <p className="text-sm text-success font-medium">{successMsg}</p>
        </div>
      )}

      {stage === "cart" && (
        <>
          <section className="kc-card p-5">
            <h2 className="text-lg font-semibold mb-3">Tambah Barang</h2>
            <form onSubmit={addItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="kc-label">Nama Barang</label>
                <input
                  className="kc-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="cth: Nasi Goreng"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="kc-label">Harga (Rp)</label>
                <input
                  className="kc-input"
                  inputMode="numeric"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="cth: 12000"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="kc-label">Qty</label>
                <input
                  className="kc-input"
                  inputMode="numeric"
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button className="kc-btn kc-btn-secondary w-full" type="submit">
                  Tambah
                </button>
              </div>
            </form>
          </section>

          <section className="kc-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Keranjang</h2>
              <span className="kc-muted">{items.length} item</span>
            </div>
            {items.length === 0 ? (
              <p className="kc-muted">Belum ada barang.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="kc-table">
                  <thead>
                    <tr>
                      <th>Barang</th>
                      <th className="text-right">Harga</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.name}</td>
                        <td className="text-right whitespace-nowrap">{formatRupiah(it.unitPriceRupiah)}</td>
                        <td className="text-right">{it.quantity}</td>
                        <td className="text-right whitespace-nowrap font-medium">
                          {formatRupiah(it.unitPriceRupiah * it.quantity)}
                        </td>
                        <td className="text-right">
                          <button
                            className="text-danger hover:underline text-sm"
                            onClick={() => removeItem(it.id)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="kc-muted">Total: </span>
                <span className="text-xl font-bold">{formatRupiah(total)}</span>
              </div>
              <button className="kc-btn kc-btn-primary" onClick={startPayment} disabled={items.length === 0}>
                Bayar
              </button>
            </div>
          </section>
        </>
      )}

      {(stage === "await-card" || stage === "processing") && (
        <section className="kc-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tap Kartu RFID Siswa</h2>
            <button className="kc-btn kc-btn-secondary" onClick={cancelFlow}>
              Batal
            </button>
          </div>
          <p className="kc-muted mb-3">
            Total: <strong>{formatRupiah(total)}</strong>. Minta siswa menempelkan kartu pada reader.
          </p>
          <form onSubmit={onCardSubmit}>
            <input
              ref={cardInputRef}
              className="kc-input font-mono text-lg tracking-widest"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              placeholder="Menunggu tap kartu..."
              autoComplete="off"
              disabled={stage === "processing"}
            />
          </form>
          {stage === "processing" && <p className="kc-muted mt-2">Memeriksa kartu...</p>}
        </section>
      )}

      {stage === "await-pin" && lookup && (
        <section className="kc-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Masukkan PIN</h2>
            <button className="kc-btn kc-btn-secondary" onClick={cancelFlow}>
              Batal
            </button>
          </div>
          <div className="mb-3 text-sm">
            <p>
              Nama: <strong>{lookup.fullName}</strong>
            </p>
            <p>Grha: {lookup.grha}</p>
            <p>
              Total: <strong>{formatRupiah(total)}</strong>
            </p>
            <p>
              Saldo tersedia: <strong>{formatRupiah(lookup.balanceRupiah)}</strong>
            </p>
            {lookup.monthlyLimitRupiah != null && (
              <p className="kc-muted">
                Limit bulanan: {formatRupiah(lookup.monthlyLimitRupiah)} &bull; Terpakai:{" "}
                {formatRupiah(lookup.monthSpentRupiah)}
              </p>
            )}
          </div>

          <form onSubmit={submitPin} className="space-y-3">
            <div>
              <label className="kc-label">PIN Siswa</label>
              <input
                ref={pinInputRef}
                type="password"
                className="kc-input font-mono text-2xl tracking-[0.5em] text-center"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                maxLength={6}
                autoComplete="off"
              />
              <p className="kc-muted mt-1">
                Karakter tersembunyi. Gunakan numpad atau keyboard.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-xs">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="kc-btn kc-btn-secondary font-mono text-lg"
                  onClick={() => appendPinDigit(d)}
                >
                  {d}
                </button>
              ))}
              <button type="button" className="kc-btn kc-btn-secondary col-span-2 text-lg" onClick={backspacePin}>
                Hapus
              </button>
              <button
                type="button"
                className="kc-btn kc-btn-secondary font-mono text-lg"
                onClick={() => appendPinDigit("0")}
              >
                0
              </button>
            </div>

            <button className="kc-btn kc-btn-primary" type="submit">
              Konfirmasi Pembayaran
            </button>
          </form>
        </section>
      )}

      {stage === "success" && (
        <section className="kc-card p-5 text-center">
          <p className="text-2xl font-bold text-success mb-2">Pembayaran Berhasil</p>
          <p className="kc-muted mb-4">{successMsg}</p>
          <button className="kc-btn kc-btn-primary" onClick={() => setStage("cart")}>
            Transaksi Baru
          </button>
        </section>
      )}
    </div>
  );
}
