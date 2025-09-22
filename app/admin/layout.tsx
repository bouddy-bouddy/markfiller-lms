export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="font-semibold">MarkFiller Admin</div>
          <nav className="text-sm opacity-80">Licenses</nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
