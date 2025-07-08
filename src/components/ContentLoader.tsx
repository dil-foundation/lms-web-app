export const ContentLoader = ({ message }: { message?: string }) => {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        {message && <p className="text-lg text-foreground animate-pulse">{message}</p>}
      </div>
    </div>
  );
}; 