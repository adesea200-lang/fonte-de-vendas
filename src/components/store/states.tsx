import { Link } from "@tanstack/react-router";
import { PackageX, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <PackageX className="mb-4 size-8 text-foreground/30" />
      <h3 className="mb-2 text-base">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-4 size-7 text-destructive" />
      <h3 className="mb-2 text-base">Algo deu errado</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {message ?? "Não conseguimos carregar estas informações agora. Tente novamente em instantes."}
      </p>
      <Link
        to="/"
        className="border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
      >
        Voltar para a loja
      </Link>
    </div>
  );
}
