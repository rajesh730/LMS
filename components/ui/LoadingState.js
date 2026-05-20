import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoadingState({
  title = "Preparing this screen",
  message = "Getting the latest information ready for you.",
  className = "",
}) {
  return (
    <div
      className={`pratyo-card flex min-h-[220px] flex-col items-center justify-center rounded-2xl px-6 py-10 text-center ${className}`}
    >
      <LoadingSpinner text="" size="md" />
      <h3 className="mt-5 text-lg font-black text-[#17120a]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#52657d]">
        {message}
      </p>
    </div>
  );
}
