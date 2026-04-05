export default function AgentCard() {
  return (
    <div className="py-2 flex items-center justify-between border-b border-white/5 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
      <div className="flex items-center">
        <h3 className="text-sm font-medium tracking-wide text-white">Agent Proposal</h3>
      </div>
      <p className="text-xs text-white/50 tracking-widest uppercase">Validating...</p>
      {/* TODO: Implement Agent Display and Chart */}
    </div>
  );
}
