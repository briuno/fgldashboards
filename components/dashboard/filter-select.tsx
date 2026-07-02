"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterSelectProps = {
  param: string; // nome do searchParam que este select controla
  value?: string;
  options: string[];
  placeholder: string; // opção "Todos"
};

/** Dropdown que grava a escolha na URL (?param=...) — filtros estilo Power BI. */
export function FilterSelect({ param, value, options, placeholder }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        if (e.target.value) params.set(param, e.target.value);
        else params.delete(param);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="border-input bg-background focus-visible:ring-ring h-9 max-w-56 rounded-md border px-2.5 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
