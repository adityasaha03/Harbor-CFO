import * as React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>HarborCFO &bull; Smart, stress-free financial copilot for growing businesses</p>
      </footer>
    </div>
  );
}
