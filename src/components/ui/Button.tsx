import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function Button({ onClick, onTouchEnd, ...props }: ButtonProps) {
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onTouchEnd?.(e)
    // Trigger the click handler on touch
    onClick?.(e as any)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
      {...props}
    />
  )
}
