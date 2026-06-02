"use client";

interface AccentButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function AccentButton({ children, onClick }: AccentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-primary w-full max-w-xs rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition duration-200 hover:-translate-y-0.5 hover:bg-rose-400"
    >
      {children}
    </button>
  );
}
