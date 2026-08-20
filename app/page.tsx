import UserForm from "@/components/user-form";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-[#f5f3ee] px-4 py-12">
      <div className="w-full max-w-lg">
        <UserForm />
      </div>
    </main>
  );
}