"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, LogOut, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LIMITS } from "@/lib/limits";

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground ${className}`}
    >
      {children}
    </p>
  );
}

export function SettingsClient({ email }: { email: string }) {
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < LIMITS.passwordMin) {
      toast.error(`New passwords need at least ${LIMITS.passwordMin} characters.`);
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Couldn't update the password.");
        return;
      }
      toast.success("Password updated.");
      setCurrent("");
      setNext("");
    } catch {
      toast.error("Network hiccup — try again.");
    } finally {
      setPwBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const deleteAccount = async () => {
    setDelBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Couldn't delete the account.");
        return;
      }
      toast("Account deleted. Goodbye.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Network hiccup — try again.");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="pb-6">
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* account card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <Eyebrow className="mb-5">Signed in as</Eyebrow>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5">
            <MailCheck className="size-[18px] shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{email}</span>
            <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-[3px] font-mono text-[10.5px] text-emerald-700 dark:text-emerald-400">
              verified
            </span>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={signOut}
              className="h-9 rounded-lg text-[13px]"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </section>

        {/* password card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="size-3.5 text-muted-foreground" />
            <Eyebrow>Change password</Eyebrow>
          </div>
          <form onSubmit={changePassword} className="grid gap-4">
            <div>
              <label htmlFor="current" className="mb-1.5 block text-[13px] font-medium">
                Current password
              </label>
              <Input
                id="current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                className="h-10 rounded-lg"
                required
              />
            </div>
            <div>
              <label htmlFor="next" className="mb-1.5 block text-[13px] font-medium">
                New password
              </label>
              <Input
                id="next"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="h-10 rounded-lg"
                required
              />
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                At least {LIMITS.passwordMin} characters.
              </p>
            </div>
            <Button type="submit" disabled={pwBusy || !current || !next} className="h-10 w-fit rounded-lg px-5 text-[13.5px]">
              {pwBusy && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </section>

        {/* danger zone */}
        <section className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-xs sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="size-3.5 text-destructive" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-destructive">
              Danger zone
            </p>
          </div>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Deleting your account removes your page, your username and every
            link in it — permanently, and immediately. There is no undo.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmText("");
              setDeleteOpen(true);
            }}
            className="mt-4 h-9 rounded-lg text-[13px]"
          >
            Delete my account
          </Button>
        </section>
      </div>

      {/* delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This wipes your page, username and links forever. Type{" "}
              <span className="font-mono font-semibold text-foreground">DELETE</span>{" "}
              below to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            className="h-10 rounded-lg font-mono"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-lg">
              Keep my page
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || delBusy}
              onClick={deleteAccount}
              className="rounded-lg"
            >
              {delBusy && <Loader2 className="size-4 animate-spin" />}
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
