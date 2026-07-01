"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ship } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Message = { type: "error" | "success"; text: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signInWithMagicLink() {
    if (!email) {
      setMessage({ type: "error", text: "Informe seu e-mail primeiro." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({
      type: "success",
      text: "Enviamos um link de acesso para o seu e-mail.",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary text-primary-foreground mb-2 flex size-11 items-center justify-center rounded-xl">
            <Ship className="size-6" />
          </div>
          <CardTitle className="text-xl">FGL Dashboards</CardTitle>
          <CardDescription>
            Acesse os indicadores de gestão da FGL Global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signInWithPassword} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@fglglobal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && (
              <p
                className={
                  message.type === "error"
                    ? "text-destructive text-sm"
                    : "text-sm text-emerald-600"
                }
              >
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="w-full"
              onClick={signInWithMagicLink}
            >
              Entrar por link mágico
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
