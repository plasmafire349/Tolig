import { UserRound } from "lucide-react";
import { PEOPLE } from "@/lib/tolig";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  me: string;
  onChange: (id: string) => void;
};

export function PersonSelector({ me, onChange }: Props) {
  const current = PEOPLE.find((p) => p.id === me);
  return (
    <section className="rounded-3xl border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Who are you?</p>
          <p className="text-xs text-muted-foreground">
            {current ? `Saving availability as ${current.name}` : "Pick your name to start"}
          </p>
        </div>
        <Select value={me} onValueChange={onChange}>
          <SelectTrigger className="h-11 w-40 rounded-full font-medium" aria-label="Who are you?">
            <SelectValue placeholder="Select yourself" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {PEOPLE.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              p.id === me
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
    </section>
  );
}
