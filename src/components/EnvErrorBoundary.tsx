import { isEnvConfigured, getMissingEnvVars } from "@/lib/env";
import { AlertTriangle } from "lucide-react";

interface EnvErrorBoundaryProps {
  children: React.ReactNode;
}

export function EnvErrorBoundary({ children }: EnvErrorBoundaryProps) {
  if (!isEnvConfigured()) {
    const missing = getMissingEnvVars();
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-destructive mb-2">
            Configuration Error
          </h1>
          <p className="text-muted-foreground mb-4">
            The application is missing required environment variables:
          </p>
          <ul className="text-sm text-destructive/80 bg-destructive/5 rounded p-3 mb-4">
            {missing.map((varName) => (
              <li key={varName} className="font-mono">
                {varName}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Please ensure all required environment variables are configured.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
