import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 pt-16 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
