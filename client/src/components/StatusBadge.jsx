const statusStyles = {
  approved: "bg-green-50 text-green-700",
  available: "bg-green-50 text-green-700",
  completed: "bg-green-50 text-green-700",
  active: "bg-green-50 text-green-700",
  pending: "bg-amber-500 text-slate-900",
  scheduled: "bg-amber-500 text-slate-900",
  in_progress: "bg-cyan-50 text-cyan-800",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }) {
  const style = statusStyles[status] || "bg-slate-100 text-slate-600";

  return <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${style}`}>{status.replaceAll("_", " ")}</span>;
}

export default StatusBadge;
