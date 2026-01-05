"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let loginEmail = email.includes('@') ? email : email + '@nawabus.com';

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      // Check user has company_id after successful login
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
          await supabase.auth.signOut(); // Log out if profile fetch fails
        } else if (profile && profile.company_id) {
          // User has company_id - valid company employee
          // Sync Supabase session cookies on the server before redirecting.
          const { data: { session } } = await supabase.auth.getSession();
          try {
            await fetch("/api/auth/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "SIGNED_IN", session }),
            });
          } catch {}

          // Redirect to dashboard
          router.replace('/');
        } else {
          setError("Access Denied: Only company employees can access this portal.");
          await supabase.auth.signOut();
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Portal da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Telefone</Label>
              <Input
                id="email"
                type="text"
                placeholder="9xx"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
