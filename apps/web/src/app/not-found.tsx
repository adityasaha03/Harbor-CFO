import Link from 'next/link';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg text-center" data-testid="not-found-page">
        <CardHeader className="space-y-2 pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
            <FileQuestion className="h-7 w-7" />
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Error 404
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-xs">
            The page you are looking for doesn&apos;t exist, has been moved, or may contain a typo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground pb-4">
          <p>
            Please check the URL or return to the HarborCFO workspace.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-2 border-t border-border/50">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto text-xs gap-1.5">
            <Link href="/sign-in">
              <ArrowLeft className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full sm:w-auto text-xs gap-1.5">
            <Link href="/dashboard">
              <Home className="h-3.5 w-3.5" />
              Go to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
