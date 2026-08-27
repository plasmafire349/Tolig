import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ZONES, type ZoneId } from "@/lib/tolig";

type Props = {
  dark: boolean;
  onDarkChange: (v: boolean) => void;
  primary: ZoneId;
  onPrimaryChange: (z: ZoneId) => void;
};

export function SettingsDialog({ dark, onDarkChange, primary, onPrimaryChange }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" className="size-11 rounded-full">
          <Settings className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Just the essentials.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
          <Label htmlFor="dark-mode" className="text-sm font-medium">
            Dark mode
          </Label>
          <Switch id="dark-mode" checked={dark} onCheckedChange={onDarkChange} />
        </div>

        <div className="rounded-2xl border p-4">
          <p className="mb-3 text-sm font-medium">Primary timezone</p>
          <div className="grid grid-cols-2 gap-2">
            {(["fi", "in"] as ZoneId[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => onPrimaryChange(z)}
                className={cn(
                  "min-h-12 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  primary === z
                    ? "border-primary bg-primary/10 text-foreground"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                {ZONES[z].flag} {ZONES[z].label}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
