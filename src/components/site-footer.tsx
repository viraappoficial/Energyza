import { business } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted">
      <p>
        © {new Date().getFullYear()} {business.legalName} · CNPJ {business.cnpj}
      </p>
      <p className="mt-1">
        {business.city}/{business.state} e região
      </p>
    </footer>
  );
}
