import React from 'react'
import { LuSparkles } from 'react-icons/lu'

export default function Logo({ size = 34, showText = true, iconSize = 19 }) {
  return (
    <span className="a2l-logo">
      <span className="a2l-logo__mark" style={{ width: size, height: size, borderRadius: size * 0.32 }}>
        <LuSparkles size={iconSize} strokeWidth={2.4} aria-hidden="true" />
      </span>
      {showText && (
        <span className="a2l-logo__text">
          Adapt<em>2</em>Learn
        </span>
      )}
    </span>
  )
}
