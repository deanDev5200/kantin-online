import { getCashierSession } from "@/lib/session";
import { CashierLogin } from "@/components/cashier-login";
import { CashierTerminal } from "@/components/cashier-terminal";

export default async function CashierPage() {
  const authed = await getCashierSession();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 flex-1">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Kasir Business Center</h1>
        <p className="kc-muted">Kantin Canggih</p>
      </div>
      {authed ? <CashierTerminal /> : <CashierLogin />}
    </main>
  );
}
