import { useState } from "react";

function PasswordInput({ className, ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input className={className} type={isVisible ? "text" : "password"} {...inputProps} />
      <button
        className="absolute inset-y-0 right-3 text-sm font-semibold text-cyan-800 hover:underline"
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default PasswordInput;
