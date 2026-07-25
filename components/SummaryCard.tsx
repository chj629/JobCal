interface SummaryCardProps {
  label: string;
  value: number;
}

export default function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-6">
      <p className="text-sm text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
