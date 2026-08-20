import AdminPanel from "@/components/admin-panel";

export const metadata = {
  title: "Dashboard Admin | Antrean",
};

export default function AdminPage() {
  return (
    <main className="min-h-svh flex-1 bg-[#f5f3ee] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <AdminPanel />
      </div>
    </main>
  );
}