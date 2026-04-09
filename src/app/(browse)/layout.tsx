import { SiteHeader } from "@/components/layout/site-header";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader theme="light" />
      {children}
    </div>
  );
}
