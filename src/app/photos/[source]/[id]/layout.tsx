import { SiteHeader } from "@/components/layout/site-header";

export default function PhotoDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="flex min-h-full flex-col bg-background text-foreground">
      <SiteHeader theme="dark" />
      {children}
    </div>
  );
}
