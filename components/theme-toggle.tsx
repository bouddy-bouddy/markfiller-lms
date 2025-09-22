"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button variant="secondary" size="sm" onClick={() => setTheme(next)}>
      {theme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
