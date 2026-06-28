import clsx from "clsx";
import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function InputForwardRef({
  label,
  id,
  error,
  hint,
  className = "",
  wrapperClassName = "",
  ...props
}, ref) {
  const inputRef = useRef();
  const generatedId = useId();
  useImperativeHandle(ref, () => inputRef.current);

  const inputId = id || props.name || generatedId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="pravyo-field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          className={clsx("pravyo-input", className)}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--brand-muted)]">{hint}</p>
        )}
      </div>
    </div>
  );
}

const Input = forwardRef(InputForwardRef);

export function PasswordInput({
  label = "Password",
  id,
  showPassword,
  onToggleShow,
  className = "",
  wrapperClassName = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="pravyo-field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          className={clsx("pravyo-input pr-11", className)}
          {...props}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--brand-muted)] transition hover:text-[var(--brand-primary)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls={inputId}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
    </div>
  );
}

export default Input;
