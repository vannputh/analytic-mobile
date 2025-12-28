"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Upload, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navigation() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold">
              📺 Media Tracker
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/add")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/import")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="p-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

