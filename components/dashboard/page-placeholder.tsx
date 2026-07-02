import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

type PagePlaceholderProps = {
  title: string;
  description: string;
  points: string[];
};

export function PagePlaceholder({
  title,
  description,
  points,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader title={title} description={description}>
        <Badge variant="secondary">Em construção</Badge>
      </PageHeader>
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium">
            Indicadores previstos (vamos definir juntos):
          </p>
          <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="bg-primary/50 mt-1.5 inline-block size-1.5 shrink-0 rounded-full" />
                {p}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
