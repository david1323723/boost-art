import React, { useState } from 'react';
import './PasswordInput.css';

const PasswordInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  maxLength,
  className = '',
  ...props
}) => {

  const [showPassword, setShowPassword] = useState(false);

  // Simple toggle (no callback needed)
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`password-input-group ${className}`}>

      {label && (
        <label htmlFor={name} className="password-label">
          {label}
        </label>
      )}

      <div className="password-wrapper">

        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className="password-input"
          autoComplete="new-password"
          {...props}
        />

        <button
          type="button"
          className="password-toggle"
          onClick={togglePasswordVisibility}
          onMouseDown={(e) => e.preventDefault()}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? '👁️‍🗨️' : '👁️'}
        </button>

      </div>

    </div>
  );
};

export default PasswordInput;