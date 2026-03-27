

export const LocationName = ({ name, className = "" }: { name?: string | null; className?: string }) => {
  if (!name) return <span className="muted-copy">Unknown location</span>;
  
  const parts = name.split(',');
  
  if (parts.length <= 2) {
    return (
      <span className={`inline-flex flex-col text-left ${className}`} title={name}>
        <strong className="text-ink font-bold leading-tight">{name}</strong>
      </span>
    );
  }
  
  const mainText = parts.slice(0, 2).join(',').trim();
  const subText = parts.slice(2).join(',').trim();
  
  return (
    <span className={`inline-flex flex-col text-left ${className}`} title={name}>
      <strong className="text-ink font-bold leading-tight">{mainText}</strong>
      {subText && (
        <span className="text-[0.65rem] font-medium text-muted truncate max-w-[180px]">
          {subText}
        </span>
      )}
    </span>
  );
};
