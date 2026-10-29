import Link from "next/link";
import { ArrowUpRight, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { researchStarts } from "@/lib/research-starts";

const icons = [Pill, ShieldCheck, Stethoscope];

export function ResearchStarts({
  onChoose,
}: {
  onChoose?: (id: string) => void;
}) {
  return (
    <div className="research-starts">
      {researchStarts.map((start, index) => {
        const Icon = icons[index];
        const content = (
          <>
            <Icon size={20} strokeWidth={1.5} />
            <span>
              <strong>{start.title}</strong>
              <small>{start.description}</small>
            </span>
            <ArrowUpRight size={16} />
          </>
        );
        return onChoose ? (
          <button key={start.id} onClick={() => onChoose(start.id)}>
            {content}
          </button>
        ) : (
          <Link key={start.id} href={`/workspace?start=${start.id}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
