import {
  createElement,
  isValidElement,
} from "react";

export default function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}) {
  function renderIcon() {
    if (!icon) {
      return null;
    }

    // Supports: icon={<Activity size={16} />}
    if (isValidElement(icon)) {
      return icon;
    }

    // Supports Lucide icons: icon={Activity}
    // Lucide icons are forwardRef objects.
    if (
      typeof icon === "function" ||
      (typeof icon === "object" &&
        icon !== null &&
        "$$typeof" in icon)
    ) {
      return createElement(icon, {
        size: 15,
        strokeWidth: 2,
        "aria-hidden": true,
      });
    }

    return null;
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border border-cyan-900/70 bg-[#071426] shadow-[0_0_18px_rgba(0,120,255,0.08)] ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-cyan-900/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <span className="flex shrink-0 items-center text-cyan-300">
                {renderIcon()}
              </span>
            )}

            <h2 className="truncate text-sm font-semibold text-white">
              {title}
            </h2>
          </div>

          {action && (
            <div className="shrink-0">
              {action}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {children}
      </div>
    </section>
  );
}